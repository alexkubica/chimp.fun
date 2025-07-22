"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditorRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the root page since the editor is now there
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg">Redirecting to editor...</p>
      </div>
    </div>
  );
}
