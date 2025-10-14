"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";

interface Opportunity {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseDate: string;
}

export default function OpportunitiesPage() {
  const { token, isLoading } = useAuth();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !token) {
      router.push("/login");
    }
  }, [isLoading, token, router]);

  useEffect(() => {
    if (token) {
      fetchOpportunities();
    }
  }, [token]);

  const fetchOpportunities = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'https://crm-api-gateway-bjnb.onrender.com/api';
      const response = await fetch(`${apiUrl}/opportunities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setOpportunities(data);
    } catch (error) {
      console.error("Failed to fetch opportunities:", error);
      // バックエンドが利用できない場合、モックデータを使用
      const { mockOpportunities } = await import("@/lib/mockData");
      setOpportunities(mockOpportunities);
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
            <h1 className="text-2xl font-bold text-gray-900">案件一覧</h1>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
              新規案件作成
            </button>
          </div>
          {loading ? (
            <p>読み込み中...</p>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      タイトル
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      金額
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ステージ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      確度
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      完了予定日
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {opportunities.map((opp) => (
                    <tr key={opp.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {opp.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        ¥{opp.value.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {opp.stage}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {opp.probability}%
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(opp.expectedCloseDate).toLocaleDateString(
                          "ja-JP"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
