package dev.kviklet.kviklet.db.util

import org.hibernate.engine.spi.SharedSessionContractImplementor
import org.hibernate.id.IdentifierGenerator
import java.io.Serializable
import java.nio.ByteBuffer
import java.util.*

class IdGenerator : IdentifierGenerator {

    override fun generate(sharedSessionContractImplementor: SharedSessionContractImplementor, obj: Any): Serializable {
        if (obj is BaseEntity && obj.id != null && obj.id!!.length == 22) {
            return obj.id!!
        }
        return generateId()
    }

    fun generateId(): Serializable {
        val uuid = UUID.randomUUID()
        val bb: ByteBuffer = ByteBuffer.allocate(16)
        bb.putLong(uuid.mostSignificantBits)
        bb.putLong(uuid.leastSignificantBits)
        return base58encode(bb.array())
    }

    companion object {
        const val GENERATOR_NAME = "myGenerator"
    }
}
