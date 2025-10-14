'use client';

import { useEffect, useState } from 'react';

interface Report {
  totalCustomers: number;
  activeCustomers: number;
  totalOpportunities: number;
  totalOpportunityValue: number;
  totalTasks: number;
  completedTasks: number;
  totalMeetings: number;
}

interface SalesReportProps {
  token?: string;
  apiUrl?: string;
}

export default function SalesReport({ token, apiUrl }: SalesReportProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReport();
  }, [token]);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      const url = apiUrl || process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'https://crm-api-gateway-bjnb.onrender.com';
      const authToken = token || localStorage.getItem('token');

      const response = await fetch(`${url}/analytics/reports/sales-summary`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError('レポートの読み込みに失敗しました');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">{error}</div>;
  }

  if (!report) {
    return <div className="text-gray-600 text-center py-8">データがありません</div>;
  }

  const stats = [
    { name: '総顧客数', value: report.totalCustomers, change: '+12%', icon: '👥' },
    { name: 'アクティブ顧客', value: report.activeCustomers, change: '+5%', icon: '✓' },
    { name: '案件総数', value: report.totalOpportunities, change: '+8%', icon: '💼' },
    { name: '案件総額', value: `¥${(report.totalOpportunityValue / 1000000).toFixed(1)}M`, change: '+15%', icon: '💰' },
    { name: 'タスク総数', value: report.totalTasks, change: '+3%', icon: '📋' },
    { name: '完了タスク', value: report.completedTasks, change: '+10%', icon: '✅' },
    { name: '商談総数', value: report.totalMeetings, change: '+6%', icon: '📅' },
    { name: 'タスク完了率', value: `${((report.completedTasks / report.totalTasks) * 100).toFixed(0)}%`, change: '+7%', icon: '📊' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">営業レポート</h1>
          <p className="mt-2 text-sm text-gray-700">
            主要なKPIと営業活動の概要
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={fetchReport}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            再読み込み
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden"
            >
              <dt>
                <div className="absolute bg-blue-500 rounded-md p-3">
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <p className="ml-16 text-sm font-medium text-gray-500 truncate">{stat.name}</p>
              </dt>
              <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                  {stat.change}
                </p>
              </dd>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">営業活動サマリー</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">タスク進捗</span>
              <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(report.completedTasks / report.totalTasks) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {report.completedTasks}/{report.totalTasks}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">顧客アクティブ率</span>
              <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${(report.activeCustomers / report.totalCustomers) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {((report.activeCustomers / report.totalCustomers) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
