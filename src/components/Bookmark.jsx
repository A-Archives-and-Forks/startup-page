import React from "react";

function getParsableUrl(url) {
  if (typeof url !== "string") {
    return "";
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

export function getHostname(url) {
  try {
    return new URL(getParsableUrl(url)).hostname.replace(/^www\./, "");
  } catch (_error) {
    return "";
  }
}

export function faviconUrl(url) {
  const host = getHostname(url);
  return host ? `https://www.google.com/s2/favicons?domain=${host}&sz=16` : null;
}

export function isSelfHostedUrl(url) {
  try {
    const parsed = new URL(getParsableUrl(url));
    const host = parsed.hostname.toLowerCase();

    return (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.endsWith(".local") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    );
  } catch (_error) {
    return false;
  }
}

export function LocalServiceStatus({ url, className = "size-3.5" }) {
  const [online, setOnline] = React.useState(false);

  React.useEffect(() => {
    const requestUrl = getParsableUrl(url);

    if (!requestUrl) {
      setOnline(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
      setOnline(false);
    }, 2500);

    setOnline(false);

    fetch(requestUrl, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(() => {
        window.clearTimeout(timeout);
        setOnline(true);
      })
      .catch(() => {
        window.clearTimeout(timeout);
        setOnline(false);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [url]);

  const dotColor = online ? "#22c55e" : "#ef4444";

  return (
    <span
      className={`${className} inline-block shrink-0 rounded-full`}
      style={{ backgroundColor: dotColor }}
      title={`Local service ${online ? "online" : "offline"}`}
      aria-label={`Local service ${online ? "online" : "offline"}`}
    />
  );
}

const Bookmark = ({ title, content, cardClass, onTitleClick }) => {
  const titleContent = (
    <div className="mt-1 truncate text-sm font-semibold leading-none text-primary-foreground">
      {title}
    </div>
  );

  return (
    <div
      className={
        cardClass ||
        "bg-primary text-primary-foreground rounded-xl col-span-1 h-36 w-36 overflow-hidden border border-border/50 shadow-lg"
      }
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-primary-foreground/15 px-3 pt-2 pb-2">
          {onTitleClick ? (
            <button
              type="button"
              onClick={onTitleClick}
              className="block w-full text-left transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary-foreground/45"
              title="Open bookmark view"
            >
              {titleContent}
            </button>
          ) : (
            titleContent
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-1">
            {content.map(({ name, url }, key) => (
              <li key={key}>
                <a
                  href={url}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-primary-foreground/10"
                  title={url}
                >
                  {isSelfHostedUrl(url) ? (
                    <LocalServiceStatus url={url} />
                  ) : faviconUrl(url) ? (
                    <img
                      src={faviconUrl(url)}
                      alt=""
                      className="size-3.5 shrink-0 rounded-sm object-contain opacity-90"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : null}
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium leading-tight text-primary-foreground">
                      {name}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] leading-none text-primary-foreground/65">
                      {getHostname(url)}
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Bookmark;
