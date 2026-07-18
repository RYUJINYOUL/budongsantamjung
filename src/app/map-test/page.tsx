"use client";

import InteractiveGosiMap from '@/components/InteractiveGosiMap';

export default function MapTestPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Interactive Gosi Map Test</h1>
      <InteractiveGosiMap
        initialSigunguCd="11170"
        initialLat={37.546872}
        initialLng={126.972068}
      />
    </div>
  );
}
