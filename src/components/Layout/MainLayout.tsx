import React from "react";
import GraphCanvas from "../GraphCanvas/GraphCanvas";

const MainLayout = () => {
  return (
    <div className="flex h-screen font-josefin bg-white">
      <div className="w-1/4 border-r border-ip-black">
        <h2 className="text-xl font-heavy p-4 text-ip-black text-center">
          Evidence Explorer
        </h2>
      </div>
      <div className="flex-1">
        <h2 className="text-xl font-heavy p-4 text-ip-black text-center">
          Argument Graph
        </h2>
        <GraphCanvas />
      </div>
      <div className="w-1/4 border-l border-ip-black">
        <h2 className="text-xl font-heavy p-4 text-ip-black text-center">
          AI Assistant
        </h2>
      </div>
    </div>
  );
};

export default MainLayout;
