"use client";
import { useState } from "react";
import Input from "./Input";
import ContinueButton from "./ContinueButton";
import PasswordToggleButton from "./PasswordToggleButton";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { fetchUserData } from "../store/slices/userSlice";
import { API_URLS } from "../lib/config";

export default function SignInForm() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!form.email || !form.password) {
        throw new Error("Both fields are required");
      }
      // Call FastAPI backend for sign in
      const response = await fetch(API_URLS.SIGNIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.toLowerCase().trim(),
          password: form.password,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to sign in");
      }

      const data = await response.json();
      console.log("Signin response:", data);

      // Store the session data in localStorage
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("user_data", JSON.stringify(data.user));

      // Fetch full user profile from backend
      await dispatch(fetchUserData(data.access_token) as any);

      // On success, redirect to graph manager
      router.push("/graph-manager");
    } catch (err: any) {
      console.error("Signin error:", err);
      setError(err.message || "An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-6 p-8 rounded-lg bg-white"
    >
      <h2 className="text-2xl font-bold text-black mb-2">Sign In</h2>
      <p className="text-black text-lg mb-6 font-normal">
        Enter your credentials below
      </p>
      <div className="flex flex-col gap-4">
        <label className="text-black text-base font-medium" htmlFor="email">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="e.g. jdoe@gmail.com"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>
      <div className="flex flex-col gap-4 relative">
        <label className="text-black text-base font-medium" htmlFor="password">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
          className="pr-12"
        />
        <PasswordToggleButton
          show={showPassword}
          onClick={() => setShowPassword((v) => !v)}
        />
      </div>
      <ContinueButton
        type="submit"
        loading={loading}
        disabled={loading}
        className="mt-4 text-lg font-semibold text-black font-[DM Sans]"
      >
        Sign In
      </ContinueButton>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <p className="text-black mt-6 text-center font-medium">
        Don&apos;t have an account?{" "}
        <a href="/" className="text-black underline">
          Sign Up
        </a>
      </p>
    </form>
  );
}
