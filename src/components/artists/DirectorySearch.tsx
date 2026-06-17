"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { TATTOO_STYLES } from "@/lib/constants";

type Initial = {
  q?: string;
  location?: string;
  style?: string;
  radius?: string;
  sort?: string;
  type?: string;
};

export function DirectorySearch({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q ?? "");
  const [location, setLocation] = useState(initial.location ?? "");
  const [style, setStyle] = useState(initial.style ?? "");
  const [radius, setRadius] = useState(initial.radius ?? "5");
  const [sort, setSort] = useState(initial.sort ?? "closest");
  const [type, setType] = useState(initial.type ?? "all");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (location.trim()) p.set("location", location.trim());
    if (radius) p.set("radius", radius);
    if (style) p.set("style", style);
    if (type !== "all") p.set("type", type);
    if (sort !== "closest") p.set("sort", sort);
    const qs = p.toString();
    router.push(qs ? `/artists?${qs}` : "/artists");
  }

  return (
    <form className="dir-filters" onSubmit={submit}>
      <div className="dir-field">
        <input className="dir-in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Artist or studio name" aria-label="Artist or studio name" />
      </div>
      <div className="dir-field">
        <LocationAutocomplete value={location} onChange={setLocation} placeholder="Town or postcode" className="dir-in" />
      </div>
      <select className="dir-in" value={radius} onChange={(e) => setRadius(e.target.value)} aria-label="Distance">
        <option value="5">Within 5 miles</option>
        <option value="10">Within 10 miles</option>
        <option value="25">Within 25 miles</option>
        <option value="50">Within 50 miles</option>
        <option value="100">Within 100 miles</option>
      </select>
      <select className="dir-in" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
        <option value="all">Artists &amp; studios</option>
        <option value="artists">Artists only</option>
        <option value="studios">Studios only</option>
      </select>
      <select className="dir-in" value={style} onChange={(e) => setStyle(e.target.value)} aria-label="Style">
        <option value="">All styles</option>
        {TATTOO_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select className="dir-in" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
        <option value="closest">Closest to you</option>
        <option value="rating">Top rated</option>
        <option value="reviews">Most reviewed</option>
      </select>
      <button className="btn" type="submit">Search</button>
    </form>
  );
}
