"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";

interface Report {
  totalCustomers: number;
  activeCustomers: number;
  totalOpportunities: number;
  totalOpportunityValue: number;
  totalTasks: number;
  completedTasks: number;
  totalMeetings: number;
}

export default function AnalyticsPage() {
  const { token, isLoading } = useAuth();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !token) {
      router.push("/login");
    }
  }, [isLoading, token, router]);

  useEffect(() => {
    if (token) {
      fetchReport();
    }
  }, [token]);

  const fetchReport = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
      const response = await fetch(`${apiUrl}/analytics/reports/sales-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !token) return null;

  return (
    <>
      <Navigation />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">営業レポート</h1>
            <button onClick={fetchReport} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
              再読み込み
            </button>
          </div>
          {loading ? (
            <p>読み込み中...</p>
          ) : report ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white p-6 shadow rounded-lg">
                <div className="text-sm font-medium text-gray-500">総顧客数</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">{report.totalCustomers}</div>
              </div>
              <div className="bg-white p-6 shadow rounded-lg">
                <div className="text-sm font-medium text-gray-500">アクティブ顧客</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">{report.activeCustomers}</div>
              </div>
              <div className="bg-white p-6 shadow rounded-lg">
                <div className="text-sm font-medium text-gray-500">案件総数</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">{report.totalOpportunities}</div>
              </div>
              <div className="bg-white p-6 shadow rounded-lg">
                <div className="text-sm font-medium text-gray-500">案件総額</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">
                  ¥{(report.totalOpportunityValue / 1000000).toFixed(1)}M
                </div>
              </div>
              <div className="bg-white p-6 shadow rounded-lg">
                <div className="text-sm font-medium text-gray-500">タスク総数</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">{report.totalTasks}</div>
              </div>
              <div className="bg-white p-6 shadow rounded-lg">
                <div className="text-sm font-medium text-gray-500">完了タスク</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">{report.completedTasks}</div>
              </div>
              <div className="bg-white p-6 shadow rounded-lg">
                <div className="text-sm font-medium text-gray-500">商談総数</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">{report.totalMeetings}</div>
              </div>
              <div className="bg-white p-6 shadow rounded-lg">
                <div className="text-sm font-medium text-gray-500">タスク完了率</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">
                  {((report.completedTasks / report.totalTasks) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          ) : (
            <p>データがありません</p>
          )}
        </div>
      </main>
    </>
  );
}
