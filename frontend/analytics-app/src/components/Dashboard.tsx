'use client';

import SalesReport from './SalesReport';

interface DashboardProps {
  token?: string;
  apiUrl?: string;
}

export default function Dashboard({ token, apiUrl }: DashboardProps) {
  return (
    <div>
      <SalesReport token={token} apiUrl={apiUrl} />
    </div>
  );
}
