import React from "react";
import { NotificationList } from "../notification/NotifcationList";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Notifications() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate(-1); // go back
  };

  return (
    <div className="p-2 max-w-4xl mx-auto">

      {/* Header + Close button */}
      <div className="flex items-center justify-between mb-2">
        <h1 id="notifications-title" className="text-2xl font-semibold">Notifications</h1>

        <button
          id="notifications-close-btn"
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="text-muted-foreground mb-4">
        Manage and view your latest alerts.
      </p>

      <div className="bg-white border rounded-xl shadow-sm p-0 dark:bg-card overflow-hidden">
        <NotificationList />
      </div>

    </div>
  );
}
