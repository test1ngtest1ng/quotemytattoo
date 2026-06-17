"use client";

import { useState } from "react";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

const input =
  "w-full rounded-[10px] border border-line px-4 py-3 outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/20";

/** Town + predictive postcode fields for the studio form (submitted via name attrs). */
export function StudioLocationFields() {
  const [area, setArea] = useState("");
  const [postcode, setPostcode] = useState("");

  return (
    <>
      <div>
        <label className="text-sm font-semibold">
          Postcode <span className="font-normal text-muted">(start typing to search)</span>
        </label>
        <LocationAutocomplete
          name="location_postcode"
          className={input + " mt-1.5 pr-10"}
          value={postcode}
          onChange={setPostcode}
          onTown={(t) => setArea(t)}
          placeholder="e.g. E1 6QL"
        />
      </div>
      <div>
        <label className="text-sm font-semibold">Town / city</label>
        <LocationAutocomplete
          name="location_area"
          className={input + " mt-1.5 pr-10"}
          value={area}
          onChange={setArea}
          placeholder="e.g. London - fills in from your postcode"
        />
      </div>
      <div>
        <label className="text-sm font-semibold">
          Studio address <span className="font-normal text-muted">(shown to a customer only after they book)</span>
        </label>
        <input
          name="address_line"
          className={input + " mt-1.5"}
          placeholder="e.g. 12 Redchurch Street"
        />
      </div>
    </>
  );
}
