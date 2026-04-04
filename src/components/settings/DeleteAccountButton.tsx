"use client";
import { useState } from "react";

export function DeleteAccountButton() {
  const [showConfirm, setShowConfirm] = useState(false);

  function handleConfirm() {
    // Phase 1 stub: account deletion coming in a future plan
    setShowConfirm(false);
    // TODO: implement account deletion in a future phase
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
      >
        Delete account
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm bg-[#141414] border border-white/[0.06] rounded-xl p-6 shadow-xl">
            <h3 className="text-base font-semibold">Delete account</h3>
            <p className="text-sm text-[#8a8580] mt-2">
              Delete this account and all your data? This can&apos;t be undone.
            </p>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-white/[0.08] text-[#e8e4df] hover:bg-white/[0.06] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                Delete account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
