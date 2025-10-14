"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";

export default function HomePage() {
  const { token, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    customers: 0,
    tasks: 0,
    opportunities: 0,
    meetings: 0,
  });

  useEffect(() => {
    if (!isLoading && !token) {
      router.push("/login");
    }
  }, [isLoading, token, router]);

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  const fetchStats = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
      const [customersRes, tasksRes, opportunitiesRes, meetingsRes] =
        await Promise.all([
          fetch(`${apiUrl}/customers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiUrl}/sales-activities/tasks`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiUrl}/opportunities`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiUrl}/sales-activities/meetings`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      const [customers, tasks, opportunities, meetings] = await Promise.all([
        customersRes.json(),
        tasksRes.json(),
        opportunitiesRes.json(),
        meetingsRes.json(),
      ]);

      setStats({
        customers: customers.length || 0,
        tasks: tasks.length || 0,
        opportunities: opportunities.length || 0,
        meetings: meetings.length || 0,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  if (isLoading || !token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            ダッシュボード
          </h1>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <div className="text-sm font-medium text-gray-500">顧客数</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {stats.customers}
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <div className="text-sm font-medium text-gray-500">タスク数</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {stats.tasks}
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <div className="text-sm font-medium text-gray-500">案件数</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {stats.opportunities}
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <div className="text-sm font-medium text-gray-500">商談数</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {stats.meetings}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
