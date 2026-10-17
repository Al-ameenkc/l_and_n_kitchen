import { DesktopGate } from "@/components/DesktopGate";
import { TableEntry } from "@/components/TableEntry";

type Params = { params: Promise<{ token: string }> };

export default async function TableQrPage({ params }: Params) {
  const { token } = await params;
  return (
    <DesktopGate>
      <TableEntry token={decodeURIComponent(token)} />
    </DesktopGate>
  );
}
