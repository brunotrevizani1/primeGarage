import { useEffect, useRef, useState } from "react";
import "./AccountMenu.css";

function AccountMenu({ onLogout }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="account-menu" ref={containerRef}>
      <button
        className="account-button"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Conta"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12a4.75 4.75 0 1 0 0-9.5 4.75 4.75 0 0 0 0 9.5Zm0 1.75c-4.42 0-8.25 2.24-8.25 5.5v.5c0 .69.56 1.25 1.25 1.25h14c.69 0 1.25-.56 1.25-1.25v-.5c0-3.26-3.83-5.5-8.25-5.5Z" />
        </svg>
      </button>

      {open && (
        <div className="account-dropdown">
          <button
            className="account-logout-button"
            type="button"
            onClick={onLogout}
          >
            Sair da conta
          </button>
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
