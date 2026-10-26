// src/pages/my-group/LeaderViewSelect.tsx
// La Líder elige qué órdenes ver: las suyas, las de todo su grupo o las de una vendedora (spec §4.1).
// Solo aparece si la usuaria lidera un grupo. El servidor decide el grupo (?scope=group) y rechaza el resto.
import React, { useEffect, useState } from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { useUserStore } from "../../store/user/UserStore";
import { assignmentApi } from "../round-robin/assignmentApi";
import { MyGroupData } from "../../interfaces/assignment.types";
import { LeaderView, MY_ORDERS } from "./leaderView";

export const LeaderViewSelect: React.FC<{ value: LeaderView; onChange: (v: LeaderView) => void; minWidth?: number; fullWidth?: boolean }> = ({ value, onChange, minWidth = 170, fullWidth = false }) => {
    const user = useUserStore((s) => s.user);
    const [members, setMembers] = useState<{ id: number; name: string }[]>([]);

    useEffect(() => {
        if (!user.leader_group) return;
        assignmentApi<MyGroupData>("/my-group").then((res) => {
            if (res.ok && res.data) setMembers(res.data.members.filter((m) => m.id !== res.data!.me).map((m) => ({ id: m.id, name: m.name })));
        });
    }, [user.leader_group]);

    if (!user.leader_group) return null;

    const selected = value.scope === "" ? "mine" : value.sellerId || "group";

    return (
        <FormControl size="small" fullWidth={fullWidth} sx={{ minWidth, bgcolor: "background.paper", borderRadius: 1 }}>
            <InputLabel>Ver</InputLabel>
            <Select
                value={selected}
                label="Ver"
                onChange={(e) => {
                    const v = String(e.target.value);
                    onChange(v === "mine" ? MY_ORDERS : v === "group" ? { scope: "group", sellerId: "" } : { scope: "group", sellerId: v });
                }}
            >
                <MenuItem value="mine">Mis órdenes</MenuItem>
                <MenuItem value="group">Todo mi grupo</MenuItem>
                {members.map((m) => (
                    <MenuItem key={m.id} value={String(m.id)}>{m.name}</MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};
