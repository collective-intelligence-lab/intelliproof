import React from "react";
import dynamic from "next/dynamic";

const GraphCanvas = dynamic(() => import("../GraphCanvas/GraphCanvas"), { ssr: false });

const MainLayout = ({ hideNavbar = false }: { hideNavbar?: boolean }) => {
  return (
    <div className="h-screen">
      <GraphCanvas hideNavbar={hideNavbar} />
    </div>
  );
};

export default MainLayout;
