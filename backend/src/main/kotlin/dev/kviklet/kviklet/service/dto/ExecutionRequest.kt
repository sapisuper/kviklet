package dev.kviklet.kviklet.service.dto

import dev.kviklet.kviklet.db.User
import dev.kviklet.kviklet.security.Permission
import dev.kviklet.kviklet.security.PolicyGrantedAuthority
import dev.kviklet.kviklet.security.Resource
import dev.kviklet.kviklet.security.SecuredDomainId
import dev.kviklet.kviklet.security.SecuredDomainObject
import dev.kviklet.kviklet.security.UserDetailsWithId
import dev.kviklet.kviklet.service.QueryResult
import net.sf.jsqlparser.parser.CCJSqlParserUtil
import java.io.Serializable
import java.time.LocalDateTime

@JvmInline
value class ExecutionRequestId(private val id: String) : Serializable, SecuredDomainId {
    override fun toString() = id
}

enum class ReviewStatus {
    AWAITING_APPROVAL,
    APPROVED,
}

enum class ExecutionStatus {
    EXECUTABLE,
    ACTIVE,
    EXECUTED,
}

enum class RequestType {
    SingleExecution,
    TemporaryAccess,
}

/**
 * A DTO for the {@link dev.kviklet.kviklet.db.ExecutionRequestEntity} entity
 */
sealed class ExecutionRequest(
    open val id: ExecutionRequestId?,
    open val connection: Connection,
    open val title: String,
    open val type: RequestType,
    open val description: String?,
    open val executionStatus: String,
    open val createdAt: LocalDateTime = utcTimeNow(),
    open val author: User,
)

sealed class ExecutionResult(open val executionRequestId: ExecutionRequestId) : SecuredDomainObject {
    override fun getId() = executionRequestId.toString()
    override fun getDomainObjectType() = Resource.EXECUTION_REQUEST
    override fun getRelated(resource: Resource) = null
}

data class DBExecutionResult(
    override val executionRequestId: ExecutionRequestId,
    val results: List<QueryResult>,
) : ExecutionResult(executionRequestId)

data class KubernetesExecutionResult(
    override val executionRequestId: ExecutionRequestId,
    val errors: List<String>,
    val messages: List<String>,
    val finished: Boolean = true,
    val exitCode: Int? = 0,
) : ExecutionResult(executionRequestId)

data class DatasourceExecutionRequest(
    override val id: ExecutionRequestId?,
    override val connection: DatasourceConnection,
    override val title: String,
    override val type: RequestType,
    override val description: String?,
    val statement: String?,
    val readOnly: Boolean,
    override val executionStatus: String,
    override val createdAt: LocalDateTime = utcTimeNow(),
    override val author: User,
) : ExecutionRequest(id, connection, title, type, description, executionStatus, createdAt, author)

data class KubernetesExecutionRequest(
    override val id: ExecutionRequestId?,
    override val connection: KubernetesConnection,
    override val title: String,
    override val type: RequestType,
    override val description: String?,
    override val executionStatus: String,
    override val createdAt: LocalDateTime = utcTimeNow(),
    override val author: User,
    val namespace: String?,
    val podName: String?,
    val containerName: String?,
    val command: String?,
) : ExecutionRequest(
    id,
    connection,
    title,
    type,
    description,
    executionStatus,
    createdAt,
    author,
)

data class ExecutionRequestDetails(
    val request: ExecutionRequest,
    val events: MutableSet<Event>,
) : SecuredDomainObject {
    fun addEvent(event: Event): ExecutionRequestDetails {
        events.add(event)
        return this
    }

    fun resolveReviewStatus(): ReviewStatus {
        val reviewConfig = request.connection.reviewConfig
        val numReviews = getApprovalCount()
        val reviewStatus = if (numReviews >= reviewConfig.numTotalRequired) {
            ReviewStatus.APPROVED
        } else {
            ReviewStatus.AWAITING_APPROVAL
        }

        return reviewStatus
    }

    fun getApprovalCount(): Int {
        val latestEdit = events.filter { it.type == EventType.EDIT }.sortedBy { it.createdAt }.lastOrNull()
        val latestEditTimeStamp = latestEdit?.createdAt ?: LocalDateTime.MIN
        val numReviews = events.filter {
            it.type == EventType.REVIEW && it is ReviewEvent && it.action == ReviewAction.APPROVE &&
                it.createdAt > latestEditTimeStamp
        }.groupBy { it.author.getId() }.count()
        return numReviews
    }

    fun resolveExecutionStatus(): ExecutionStatus {
        when (request.type) {
            RequestType.SingleExecution -> {
                val executions = events.filter { it.type == EventType.EXECUTE }
                request.connection.maxExecutions?.let { maxExecutions ->
                    if (maxExecutions == 0) { // magic number for unlimited executions
                        return ExecutionStatus.EXECUTABLE
                    }
                    if (executions.size >= maxExecutions) {
                        return ExecutionStatus.EXECUTED
                    }
                }
                return ExecutionStatus.EXECUTABLE
            }
            RequestType.TemporaryAccess -> {
                val executions = events.filter { it.type == EventType.EXECUTE }
                if (executions.isEmpty()) {
                    return ExecutionStatus.EXECUTABLE
                }
                val firstExecution = executions.minBy { it.createdAt }
                return if (firstExecution.createdAt < utcTimeNow().minusMinutes(60)) {
                    ExecutionStatus.EXECUTED
                } else {
                    ExecutionStatus.ACTIVE
                }
            }
        }
    }

    override fun getId() = request.id.toString()

    override fun getDomainObjectType() = Resource.EXECUTION_REQUEST

    override fun getRelated(resource: Resource) = when (resource) {
        Resource.EXECUTION_REQUEST -> this
        Resource.DATASOURCE_CONNECTION -> request.connection
        else -> null
    }

    override fun auth(
        permission: Permission,
        userDetails: UserDetailsWithId,
        policies: List<PolicyGrantedAuthority>,
    ): Boolean {
        return when (permission) {
            Permission.EXECUTION_REQUEST_EDIT -> request.author.getId() == userDetails.id
            Permission.EXECUTION_REQUEST_EXECUTE -> request.author.getId() == userDetails.id && isExecutable()
            else -> true
        }
    }

    private fun isExecutable(): Boolean {
        return resolveReviewStatus() == ReviewStatus.APPROVED
    }

    fun csvDownloadAllowed(query: String? = null): Pair<Boolean, String> {
        if (request.connection !is DatasourceConnection || request !is DatasourceExecutionRequest) {
            return Pair(false, "Only Datasource Requests can be downloaded as CSV")
        }

        if (resolveReviewStatus() != ReviewStatus.APPROVED) {
            return Pair(false, "This request has not been approved yet!")
        }

        if (resolveExecutionStatus() == ExecutionStatus.EXECUTED) {
            return Pair(false, "This request has already been executed the maximum amount of times!")
        }

        val queryToExecute = when (request.type) {
            RequestType.SingleExecution -> request.statement!!.trim().removeSuffix(";")
            RequestType.TemporaryAccess -> query?.trim()?.removeSuffix(
                ";",
            ) ?: return Pair(false, "Query can't be empty")
        }

        val statementCount = CCJSqlParserUtil.parseStatements(queryToExecute).size
        if (statementCount > 1) {
            return Pair(false, "This request contains more than one statement!")
        }
        if (CCJSqlParserUtil.parseStatements(queryToExecute).first() !is net.sf.jsqlparser.statement.select.Select) {
            return Pair(false, "Can only download results for select queries!")
        }
        return Pair(true, "")
    }
}

data class ExecutionProxy(
    val request: ExecutionRequest,
    val port: Int,
    val username: String,
    val password: String,
    val startTime: LocalDateTime,
) : SecuredDomainObject {
    override fun getId() = request.id.toString()

    override fun getDomainObjectType() = Resource.EXECUTION_REQUEST

    override fun getRelated(resource: Resource): SecuredDomainObject? = null
}
