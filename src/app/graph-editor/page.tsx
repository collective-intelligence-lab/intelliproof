"use client";
import React, { useState } from "react";
import Header from "../../components/Header";
import Navbar from "../../components/Navbar";
import MainLayout from "../../components/Layout/MainLayout";

export default function GraphEditorPage() {
  const [isNavbarOpen, setNavbarOpen] = useState(false);
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header userName="USERNAME" onMenuClick={() => setNavbarOpen(true)} />
      <Navbar isOpen={isNavbarOpen} onClose={() => setNavbarOpen(false)} />
      <div>
        <MainLayout />
      </div>
    </div>
  );
}
