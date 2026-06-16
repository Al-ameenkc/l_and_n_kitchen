import { DesktopGate } from "@/components/DesktopGate";
import { MenuAppLoader } from "@/components/MenuAppLoader";

export default function Home() {
  return (
    <DesktopGate>
      <MenuAppLoader />
    </DesktopGate>
  );
}
