import {
  CircleStackIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  UserIcon,
  UsersIcon,
} from "@heroicons/react/20/solid";

import { useState } from "react";
import { Link, Outlet, Route, Routes } from "react-router-dom";
import ConnectionSettings from "./connection/ConnectionSettings";
import UserSettings from "./UserSettings";
import RoleSettings from "./RolesSettings";
import React from "react";
import ProfileSettings from "./ProfileSettings";
import ConnectionDetails from "./connection/ConnectionDetails";
import RoleDetailsView from "./RoleDetailsView";
import NewRoleView from "./NewRoleView";
import GeneralSettings from "./GeneralSettings";

const Tab = (props: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  link: string;
}) => {
  return (
    <Link to={props.link}>
      <div
        onClick={props.onClick}
        className={
          "rounded pr-2 hover:bg-slate-100 dark:hover:bg-slate-900 " +
            (props.active &&
              "rounded bg-slate-200 hover:bg-slate-200 dark:bg-slate-900") || ""
        }
      >
        {props.children}
      </div>
    </Link>
  );
};

function SettingsSidebar(props: { children: React.ReactNode }) {
  return (
    <div className="mx-2 flex flex-col">
      <div className="flex flex-col divide-y-8 divide-slate-50 dark:divide-slate-950">
        {props.children}
      </div>
    </div>
  );
}

const Settings = () => {
  const [activeTab, setActiveTab] = useState<string>("general");

  const tabStyles =
    "flex flex-row items-center justify-left text-slate-700 dark:text-slate-50 text-sm p-1";
  const tabs = [
    {
      name: "general",
      tabContent: (
        <div className="flex flex-col">
          <div className={tabStyles}>
            <Cog6ToothIcon className="mr-2 h-6" />
            General
          </div>
        </div>
      ),
      link: "/settings",
    },
    {
      name: "databases",
      tabContent: (
        <div className="flex flex-col">
          <div className={tabStyles}>
            <CircleStackIcon className="mr-2 h-6" />
            Databases
          </div>
        </div>
      ),
      link: "/settings/databases",
    },
    {
      name: "users",
      tabContent: (
        <div className="flex flex-col">
          <div className={tabStyles}>
            <UserIcon className="mr-2 h-6" />
            Users
          </div>
        </div>
      ),
      link: "/settings/users",
    },
    {
      name: "roles",
      tabContent: (
        <div className="flex flex-col">
          <div className={tabStyles}>
            <UsersIcon className="mr-2 h-6" />
            Roles
          </div>
        </div>
      ),
      link: "/settings/roles",
    },
    {
      name: "profile",
      tabContent: (
        <div className="flex flex-col">
          <div className={tabStyles}>
            <UserCircleIcon className="mr-2 h-6"></UserCircleIcon>
            Profile
          </div>
        </div>
      ),
      link: "/settings/profile",
    },
  ];

  return (
    <div className="h-full w-screen dark:bg-slate-950">
      <div className="mb-3 border-b border-slate-300 dark:border-slate-700">
        <h1 className="m-5 mx-auto w-3/4 pl-1.5 text-xl">Settings</h1>
      </div>
      <div className="mx-auto h-full w-3/4">
        <div className="flex h-full w-full pt-4">
          <SettingsSidebar>
            {tabs.map((tab) => (
              <Tab
                active={activeTab === tab.name}
                onClick={() => setActiveTab(tab.name)}
                link={tab.link}
                key={tab.name}
              >
                {tab.tabContent}
              </Tab>
            ))}
          </SettingsSidebar>
          <div className="ml-2 h-full w-full">
            <Routes>
              <Route path="/*" element={<GeneralSettings />} />
              <Route path="/" element={<GeneralSettings />} />
              <Route path="databases" element={<ConnectionSettings />} />
              <Route
                path="connections/:connectionId"
                element={<ConnectionDetails />}
              />
              <Route path="users" element={<UserSettings />} />
              <Route path="roles" element={<RoleSettings />} />
              <Route path="/roles/new" element={<NewRoleView />} />
              <Route path="/roles/:roleId" element={<RoleDetailsView />} />
              <Route path="profile" element={<ProfileSettings />} />
            </Routes>
            <Outlet></Outlet>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
