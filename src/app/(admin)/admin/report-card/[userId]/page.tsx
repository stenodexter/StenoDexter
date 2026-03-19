import { AdminReportCard } from "~/components/common/report-card";

export default function AdminReportCardPage({
  params,
}: {
  params: { userId: string };
}) {
  return <AdminReportCard userId={params.userId} />;
}
