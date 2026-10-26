import React from "react";
import { useNotifications } from "../context/NotificationContext";
import { Bell, Check, Eye, X } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetClose,
    SheetOverlay,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface NotificationDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ open, onOpenChange }) => {
    const { notifications, markAsRead, acknowledge } = useNotifications();

    const fmt = (n: number | null | undefined) =>
        typeof n === "number" && Number.isFinite(n) ? (Math.round(n * 10) / 10).toLocaleString() : "-";

    const fmtDate = (iso: string | null | undefined) => {
        try {
            return iso ? new Date(iso).toLocaleString() : "-";
        } catch {
            return "-";
        }
    };

    const parsePayload = (notif: any) => {
        let data: any = null;
        try {
            data = typeof notif.text === "string" ? JSON.parse(notif.text) : notif.text;
        } catch (e) {
            data = null;
        }
        return data;
    };

    const isResolvedLike = (data: any) =>
        !!data && (typeof data.durationSeconds === "number" || (data.from && data.to));

    const isStartLike = (data: any) => !!data && (!!data.status || typeof data.value === "number" || typeof data.percent === "number");

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            {/* make the drawer a column so header stays on top and content scrolls */}
            <SheetOverlay className="bg-transparent" />

            <SheetContent side="right" className="w-96 p-0 flex flex-col max-h-screen">
                <SheetHeader className="p-4 border-b flex justify-between items-center">
                    <div>
                        <SheetTitle>Notifications</SheetTitle>
                        <SheetDescription>View your recent notifications and take action</SheetDescription>
                    </div>
                </SheetHeader>

                {/* scrollable area: flex-1 + min-h-0 are required to make overflow-y-auto work inside flex */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {notifications.length === 0 && <p className="p-4 text-gray-500">No notifications</p>}

                    {notifications.map((notif: any) => {
                        const data = parsePayload(notif);
                        const resolved = isResolvedLike(data) && !isStartLike(data);
                        const start = isStartLike(data);

                        if (!data) {
                            return (
                                <div key={notif.id} className={`p-4 border-b hover:bg-gray-50 transition ${notif.isRead ? "bg-gray-50" : "bg-white"}`}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold">{notif.title ?? "Notification"}</h3>
                                            <p className="text-sm text-gray-700">{notif.text}</p>
                                            <p className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        if (resolved) {
                            const durationSeconds = data.durationSeconds ?? Math.max(0, (new Date(data.to).getTime() - new Date(data.from).getTime()) / 1000);
                            const title = `${data.signal ?? "Signal"} back to normal — ${data.asset ?? ""}`.trim();

                            return (
                                <div key={notif.id} className={`p-4 border-b hover:bg-gray-50 transition flex ${notif.isRead ? "bg-gray-50" : "bg-white"}`}>
                                    <div className="w-1 rounded-l-md mr-3 bg-green-500" aria-hidden />

                                    <div className="flex-1">
                                        <div className="text-xs text-gray-600 text-right">{fmtDate(data.to)}</div>
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm font-semibold">
                                                {title}
                                                <div className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 w-fit">Resolved</div>
                                            </div>
                                        </div>

                                        <div className="mt-2 text-sm text-gray-700 flex justify-between">
                                            <div>Asset: <span className="font-medium">{data.asset ?? "-"}</span></div>
                                            <div>Signal: <span className="font-medium">{data.signal ?? "-"}</span></div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                                            <div>From: <div className="font-medium text-gray-800">{fmtDate(data.from)}</div></div>
                                            <div>To: <div className="font-medium text-gray-800">{fmtDate(data.to)}</div></div>
                                            <div>Duration: <div className="font-medium text-gray-800">{Math.round(durationSeconds)}s</div></div>

                                        </div>



                                        <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                                            <div>Min: <span className="font-medium text-gray-800">{fmt(data.min)}</span></div>
                                            <div>Max: <span className="font-medium text-gray-800">{fmt(data.max)}</span></div>
                                        </div>
                                        <div className="mt-1 -ml-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full bg-green-500`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        if (start) {
                            const isHigh = data?.status === "HIGH";
                            const isLow = data?.status === "LOW";
                            const percent = typeof data.percent === "number" ? data.percent : 0;
                            const progress = Math.min(Math.abs(percent), 100);

                            return (
                                <div key={notif.id} className={`p-4 border-b hover:bg-gray-50 transition flex ${notif.isRead ? "bg-gray-50" : "bg-white"}`}>
                                    <div className={`w-1 rounded-l-md mr-3 ${isHigh ? "bg-red-500" : isLow ? "bg-blue-500" : "bg-gray-400"}`} aria-hidden />

                                    <div className="flex-1">
                                        <div className="text-xs text-right text-gray-600">{fmtDate(data.timestamp ?? data.time ?? notif.createdAt)}</div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{isHigh ? "🔔" : isLow ? "ℹ️" : "⚠️"}</span>
                                                <div className="text-sm font-semibold leading-tight">
                                                    <span>{data.asset ?? "-"}</span>
                                                    <span className="text-gray-500 font-normal"> • {data.signal ?? "-"}</span>
                                                </div>
                                            </div>

                                        </div>

                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="text-sm">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${isHigh ? "bg-red-100 text-red-700" : isLow ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                                                    {data.status ?? "ALERT"}
                                                </span>

                                                <span className="ml-2 text-sm text-gray-700">{fmt(data.value)}</span>
                                                <span className="ml-2 text-xs text-gray-500"> {data.unit ?? ""}</span>
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            <div className="flex items-center justify-between text-xs text-gray-600">
                                                <div className="text-right">Δ {fmt(Math.abs(data.value - (data.status === "HIGH" ? data.max : data.min)))}</div>
                                            </div>



                                            <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                                                <div>Min: <span className="font-medium text-gray-800 ml-1">{fmt(data.min)}</span></div>
                                                <div>Max: <span className="font-medium text-gray-800 ml-1">{fmt(data.max)}</span></div>
                                            </div>
                                            <div className="mt-1 h-1 -ml-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${isHigh ? "bg-red-500" : isLow ? "bg-blue-500" : "bg-gray-500"}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // generic fallback when JSON present but doesn't match expected schema
                        return (
                            <div key={notif.id} className={`p-4 border-b hover:bg-gray-50 transition ${notif.isRead ? "bg-gray-50" : "bg-white"}`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-semibold">{notif.title ?? "Notification"}</h3>
                                        <pre className="text-xs text-gray-700 mt-1 max-w-full overflow-auto">{JSON.stringify(data)}</pre>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default NotificationDrawer;
