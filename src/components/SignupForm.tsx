"use client";
import { useState } from "react";
import ContinueButton from "./ContinueButton";
import Input from "./Input";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import PasswordToggleButton from "./PasswordToggleButton";
import { useDispatch } from "react-redux";
import { fetchUserData } from "../store/slices/userSlice";
import { API_URLS } from "../lib/config";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignupForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
    setSuccess("");
    setLoading(true);

    try {
      // Validate input
      if (!form.email || !form.password || !form.firstName || !form.lastName) {
        throw new Error("All fields are required");
      }

      if (form.password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      // Call our FastAPI backend
      const response = await fetch(API_URLS.SIGNUP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email.toLowerCase().trim(),
          password: form.password,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create account");
      }

      const data = await response.json();
      console.log("Signup response:", data);

      // Store the session data in localStorage
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("user_id", data.user_id);
        localStorage.setItem("user_data", JSON.stringify(data.user));

        // Update Redux store
        try {
          await dispatch(fetchUserData(data.access_token) as any);
          console.log("[SignupForm] Redux store updated successfully");
        } catch (error) {
          console.error("[SignupForm] Error updating Redux store:", error);
        }

        setSuccess(data.message);
        router.push("/graph-manager");
      } else {
        console.error("[SignupForm] No access token in response");
        throw new Error("No access token received from server");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      setError(error.message || "An error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-6 p-8 rounded-lg"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <h2 className="text-2xl font-semibold text-black mb-2">
        Account Sign Up
      </h2>
      <p className="text-black text-sm mb-6">Enter your information below</p>
      <div className="flex flex-col gap-4">
        <label className="text-black text-sm font-medium" htmlFor="firstName">
          First Name
        </label>
        <Input
          id="firstName"
          name="firstName"
          placeholder="e.g. John"
          value={form.firstName}
          onChange={handleChange}
          required
        />
      </div>
      <div className="flex flex-col gap-4">
        <label className="text-black text-sm font-medium" htmlFor="lastName">
          Last Name
        </label>
        <Input
          id="lastName"
          name="lastName"
          placeholder="e.g. Doe"
          value={form.lastName}
          onChange={handleChange}
          required
        />
      </div>
      <div className="flex flex-col gap-4">
        <label className="text-black text-sm font-medium" htmlFor="email">
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
        <label className="text-black text-sm font-medium" htmlFor="password">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="Password (must be at least 8 characters)"
          value={form.password}
          onChange={handleChange}
          required
          minLength={8}
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
        className="mt-4"
      >
        Sign Up
      </ContinueButton>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      {success && <p className="text-green-500 text-sm mt-2">{success}</p>}
      <p className="text-black mt-6 text-center">
        Already have an account?{" "}
        <a href="/signin" className="text-black underline">
          Log in
        </a>
      </p>
    </form>
  );
}
