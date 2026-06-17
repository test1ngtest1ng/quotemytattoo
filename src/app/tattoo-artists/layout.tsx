import "@/styles/city.css";

export default function CityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="qmt-pub">{children}</div>;
}
