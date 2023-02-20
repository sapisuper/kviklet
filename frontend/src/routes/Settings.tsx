import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import { fetchDatabases, Database, Connection } from "../api/DatasoourceApi";

function ConnectionSettings(props: {
  selectedIndex: number | undefined;
  connections: Connection[];
}) {
  return (
    <div className="w-full ml-10">
      <h2 className="text-lg font-bold m-5 pl-1.5">Connection Settings</h2>
      {props.connections.map((connection) => (
        <div>{connection.displayName}</div>
      ))}
      {props.selectedIndex}
    </div>
  );
}

function Settings() {
  const datasourceUrl = "http://localhost:8080/datasource/";
  const [databases, setDatabases] = useState<Database[]>([]);

  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const databases = await fetchDatabases();
        setDatabases(databases);
        if (databases.length > 0) {
          setSelectedIndex(0);
        }
      } catch (error) {
        console.log("error", error);
      }
    };

    fetchData();
  }, []);

  const handleCreateDatabase = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    console.log(e);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const json = Object.fromEntries(formData.entries());
    // @ts-ignore
    json.port = Number(json.port);
    console.log(json);
    const response = await fetch(datasourceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(json),
    });
    console.log("Response Status" + response.status);
  };

  return (
    <div>
      <div className="flex max-w-6xl mx-auto">
        <div className="basis-1/5 mr-auto">
          <h2 className="text-2xl font-bold m-5 pl-1.5">Databases</h2>
          <div className="text-center max-h-96 overflow-y-scroll scrollbar-thin scrollbar-track-slate-300 scrollbar-thumb-slate-600 scrollbar-thumb-rounded">
            <div className="inline">
              {databases.map((database, index) => (
                //flex items-center rounded-md p-1.5 bg-indigo-600 text-white
                <div
                  className={`flex items-center rounded-md m-5 p-1.5 cursor-pointer hover:bg-sky-500 hover:text-white ${
                    index === selectedIndex ? "bg-sky-500 text-white" : ""
                  }`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <div className="basis-1/2 my-auto text-left">
                    {database.displayName}
                  </div>
                  <div className="basis-1/4 self-end my-2 px-5 text-right">
                    {database.hostname}
                  </div>
                  <div className="hover:text-sky-500 hover:bg-white p-1.5 rounded-md active:bg-red-600 ">
                    <FontAwesomeIcon icon={solid("trash")}></FontAwesomeIcon>
                  </div>
                </div>
              ))}
              <form method="post" onSubmit={handleCreateDatabase}>
                <div className=" max-w-lg shadow p-3">
                  <div className="flex m-2">
                    <label
                      htmlFor="displayName"
                      className="my-auto ml-5 pl-1.5 mr-auto"
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      className="basis-2/3 focus:border-blue-600 my-auto appearance-none border rounded w-full mx-1 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="Database Name"
                      name="displayName"
                      id="displayName"
                    />
                  </div>
                  <div className="flex m-2">
                    <label
                      htmlFor="datasourceType"
                      className="my-auto ml-5 pl-1.5 mr-auto"
                    >
                      Database Engine
                    </label>
                    <input
                      type="text"
                      className="basis-2/3 focus:border-blue-600 my-auto appearance-none border rounded w-full mx-1 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="POSTGRESQL"
                      name="datasourceType"
                      id="datasourceType"
                    />
                  </div>
                  <div className="flex m-2">
                    <label
                      htmlFor="hostname"
                      className="my-auto ml-5 pl-1.5 mr-auto"
                    >
                      Hostname
                    </label>
                    <input
                      type="text"
                      className="basis-2/3 focus:border-blue-600 my-auto appearance-none border rounded w-full mx-1 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="localhost"
                      name="hostname"
                      id="hostname"
                    />
                  </div>
                  <div className="flex m-2">
                    <label
                      htmlFor="port"
                      className="my-auto ml-5 pl-1.5 mr-auto"
                    >
                      Port
                    </label>
                    <input
                      type="number"
                      className="basis-2/3 focus:border-blue-600 my-auto appearance-none border rounded w-full mx-1 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="5432"
                      name="port"
                      id="port"
                    />
                  </div>
                  <div className="flex mx-2 my-2">
                    <button
                      className="text-white bg-sky-500 border rounded w-full basis-1/5 py-2 ml-auto active:text-sky-500 active:bg-white"
                      type="submit"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
        <ConnectionSettings
          selectedIndex={selectedIndex}
          connections={
            selectedIndex === undefined
              ? []
              : databases[selectedIndex].datasourceConnections
          }
        />
      </div>
    </div>
  );
}

export default Settings;
