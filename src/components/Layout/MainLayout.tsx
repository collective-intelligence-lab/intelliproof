import React from "react";

const MainLayout = () => {
  return (
    <div className="flex h-screen">
      <div className="w-1/4 bg-gray-100">Left Panel</div>
      <div className="flex-1 bg-white">Center Panel</div>
      <div className="w-1/4 bg-gray-100">Right Panel</div>
    </div>
  );
};

export default MainLayout;
