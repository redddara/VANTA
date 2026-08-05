/**
 * Remounts on every portal navigation so the page-enter motion can replay.
 * Layout stays mounted (sidebar/header do not animate away).
 */
export default function PortalTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="vanta-page-enter">{children}</div>;
}
