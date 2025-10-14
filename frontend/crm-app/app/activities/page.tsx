"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: string;
  status: string;
}

interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  location?: string;
}

export default function ActivitiesPage() {
  const { token, isLoading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeTab, setActiveTab] = useState<"tasks" | "meetings">("tasks");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !token) {
      router.push("/login");
    }
  }, [isLoading, token, router]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'https://crm-api-gateway-bjnb.onrender.com/api';
      const [tasksRes, meetingsRes] = await Promise.all([
        fetch(`${apiUrl}/sales-activities/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/sales-activities/meetings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setTasks(await tasksRes.json());
      setMeetings(await meetingsRes.json());
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      // バックエンドが利用できない場合、モックデータを使用
      const { mockTasks, mockMeetings } = await import("@/lib/mockData");
      setTasks(mockTasks);
      setMeetings(mockMeetings);
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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">営業活動</h1>
          <div className="mb-4">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab("tasks")}
                  className={`${
                    activeTab === "tasks"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500"
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  タスク
                </button>
                <button
                  onClick={() => setActiveTab("meetings")}
                  className={`${
                    activeTab === "meetings"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500"
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  商談
                </button>
              </nav>
            </div>
          </div>
          {loading ? (
            <p>読み込み中...</p>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              {activeTab === "tasks" ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        タイトル
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        期限
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        優先度
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ステータス
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tasks.map((task) => (
                      <tr key={task.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {task.title}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(task.dueDate).toLocaleDateString("ja-JP")}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {task.priority}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {task.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        タイトル
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        日時
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        時間
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        場所
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {meetings.map((meeting) => (
                      <tr key={meeting.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {meeting.title}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(meeting.scheduledAt).toLocaleString(
                            "ja-JP"
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {meeting.duration}分
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {meeting.location || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
