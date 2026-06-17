import "@/styles/city.css";
import "@/styles/artist-profile.css";

export default function ArtistProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="qmt-pub">{children}</div>;
}
