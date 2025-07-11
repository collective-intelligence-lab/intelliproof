import React from "react";
import GraphCanvas from "../GraphCanvas/GraphCanvas";

const MainLayout = ({ hideNavbar = false }: { hideNavbar?: boolean }) => {
  return (
    <div className="h-screen">
      <GraphCanvas hideNavbar={hideNavbar} />
    </div>
  );
};

export default MainLayout;
