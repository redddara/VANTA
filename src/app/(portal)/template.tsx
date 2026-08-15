/**
 * Soft remount wrapper for portal navigations. Kept light so page switches
 * feel instant instead of waiting on a long enter animation.
 */
export default function PortalTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="vanta-page-enter">{children}</div>;
}
