import { DesktopGate } from "@/components/DesktopGate";
import { WaiterDevice } from "@/components/WaiterDevice";

export default function WaiterPage() {
  return (
    <DesktopGate>
      <WaiterDevice />
    </DesktopGate>
  );
}
