"use client";

type LoginPromptProps = {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
};

export function LoginPrompt({ open, onClose, onAccept }: LoginPromptProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-prompt-title"
        className="relative w-full max-w-md rounded-2xl border-2 border-pink-300 bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={onClose}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100"
        >
          ×
        </button>
        <p id="login-prompt-title" className="pr-6 text-sm leading-6 text-gray-800">
          <span className="font-semibold">NO</span> armes tu carrito si no estás
          logueado, no podrás realizar tu compra. Pulsa aceptar para dirigirte a
          la página de login.
        </p>
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onAccept}
            className="rounded-lg bg-[#2563eb] px-5 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1d4ed8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
