import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const normalizePathname = (pathname) => {
  const p = String(pathname || "");
  // Collapse multiple slashes anywhere in the path.
  const normalized = p.replace(/\/{2,}/g, "/");
  return normalized || "/";
};

export const PathNormalizer = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const nextPathname = normalizePathname(location.pathname);
    if (nextPathname !== location.pathname) {
      navigate(
        {
          pathname: nextPathname,
          search: location.search,
          hash: location.hash,
        },
        { replace: true }
      );
    }
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
};

