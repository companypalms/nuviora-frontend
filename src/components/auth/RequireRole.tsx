import React from "react";
import { useValidateSession } from "../../hooks/useValidateSession";
import { Loading } from "../ui/content/Loading";
import { Forbidden } from "./Forbidden";

export const RequireRole = ({
    allowedRoles,
    fallback,
    children,
}: {
    allowedRoles?: string[];
    fallback?: React.ReactNode; // e.g. <Forbidden />
    children: React.ReactNode;
}) => {
    const { loadingSession, isValid, user, hasRole } = useValidateSession(allowedRoles);

    if (loadingSession || !isValid || !user?.token) return <Loading />;
    if (!hasRole) return <>{fallback ?? <Forbidden />}</>;

    return <>{children}</>;
};
