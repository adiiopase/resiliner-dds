// ============================================================================
// DigitalDocs Solutions - Sovereign API Client (Replaces Supabase with PHP/MySQL)
// Backend: https://dds.digitds.cloud/api
// ============================================================================

export const DDS_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://dds.digitds.cloud/api";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dds_token") || getCookie("dds_session_token");
}

function getStoredUser(): any | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("dds_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCookie(name: string, val: string, days = 30) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(val)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function clearSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("dds_token");
    localStorage.removeItem("dds_user");
    document.cookie = "dds_session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }
}

export type QueryResult<T = any> = {
  data: T;
  error: any;
  count?: number | null;
};

class QueryBuilder {
  private table: string;
  private action: "select" | "insert" | "update" | "delete" = "select";
  private filters: Array<{ column: string; operator: string; value: any }> = [];
  private orderClause: { column: string; direction: string } | null = null;
  private limitVal: number | null = null;
  private isSingle = false;
  private payload: any = null;
  private countMode: string | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(_fields?: string, options?: { count?: string; head?: boolean }) {
    this.action = "select";
    if (options?.count) this.countMode = options.count;
    return this;
  }

  insert(data: any) {
    this.action = "insert";
    this.payload = data;
    return this;
  }

  update(data: any) {
    this.action = "update";
    this.payload = data;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, operator: "=", value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ column, operator: "!=", value });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orderClause = {
      column,
      direction: opts?.ascending ? "ASC" : "DESC",
    };
    return this;
  }

  limit(n: number) {
    this.limitVal = n;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  async execute(): Promise<QueryResult> {
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // If selecting homepage_banners or home-carousel, use dedicated endpoint
      if (this.table === "homepage_banners" || this.table === "home-carousel") {
        if (this.action === "select") {
          const res = await fetch(`${DDS_API_URL}/homepage-banners`, { headers });
          const json = await res.json();
          const items = json.images || json.data || [];
          return { data: this.isSingle ? (items[0] || null) : items, error: null, count: items.length };
        }
      }

      // Standard /query bridge
      const res = await fetch(`${DDS_API_URL}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          table: this.table,
          action: this.action,
          filters: this.filters,
          order: this.orderClause,
          limit: this.limitVal,
          single: this.isSingle,
          data: this.payload,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        return { data: null, error: { message: result.error || "Query failed" }, count: 0 };
      }
      const data = result.data;
      const count = Array.isArray(data) ? data.length : data ? 1 : 0;
      return { data, error: null, count };
    } catch (err: any) {
      return { data: null, error: { message: err.message || "Network error" }, count: 0 };
    }
  }

  then(onfulfilled?: (value: QueryResult) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class RealtimeChannel {
  private name: string;
  constructor(name: string) {
    this.name = name;
  }
  on(_event: string, _opts: any, _callback?: any) {
    return this;
  }
  subscribe(callback?: (status: string) => void) {
    if (callback) setTimeout(() => callback("SUBSCRIBED"), 10);
    return this;
  }
  presenceState<T = any>(): Record<string, any> {
    return {};
  }
  async track(presence: any) {
    try {
      await fetch(`${DDS_API_URL}/session/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(presence),
      });
    } catch {}
    return "ok";
  }
  async untrack() {
    return "ok";
  }
  async unsubscribe() {
    return "ok";
  }
}

export const supabase = {
  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const res = await fetch(`${DDS_API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { data: null, error: { message: data.error || "Identifiants incorrects" } };
        }

        const token = data.session?.access_token;
        const user = data.user;
        if (typeof window !== "undefined") {
          if (token) {
            localStorage.setItem("dds_token", token);
            setCookie("dds_session_token", token);
          }
          if (user) {
            localStorage.setItem("dds_user", JSON.stringify(user));
          }
        }
        return { data: { user, session: data.session }, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message || "Erreur de connexion" } };
      }
    },

    async signUp({ email, password }: { email: string; password: string }) {
      try {
        const res = await fetch(`${DDS_API_URL}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { data: null, error: { message: data.error || "Erreur inscription" } };
        }

        const token = data.session?.access_token;
        const user = data.user;
        if (typeof window !== "undefined") {
          if (token) {
            localStorage.setItem("dds_token", token);
            setCookie("dds_session_token", token);
          }
          if (user) {
            localStorage.setItem("dds_user", JSON.stringify(user));
          }
        }
        return { data: { user, session: data.session }, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message || "Erreur inscription" } };
      }
    },

    async signOut() {
      clearSession();
      try {
        await fetch(`${DDS_API_URL}/auth/logout`, { method: "POST" });
      } catch {}
      return { error: null };
    },

    async getUser() {
      const user = getStoredUser();
      if (user) {
        return {
          data: {
            user: {
              ...user,
              app_metadata: { role: user.role },
              user_metadata: { role: user.role },
            },
          },
          error: null,
        };
      }
      return { data: { user: null }, error: null };
    },

    async getSession() {
      const user = getStoredUser();
      const token = getStoredToken();
      if (user && token) {
        return {
          data: {
            session: {
              access_token: token,
              token_type: "bearer",
              user: {
                ...user,
                app_metadata: { role: user.role },
                user_metadata: { role: user.role },
              },
            },
          },
          error: null,
        };
      }
      return { data: { session: null }, error: null };
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      if (typeof window !== "undefined") {
        const user = getStoredUser();
        const token = getStoredToken();
        if (user && token) {
          callback("SIGNED_IN", {
            access_token: token,
            user: {
              ...user,
              app_metadata: { role: user.role },
              user_metadata: { role: user.role },
            },
          });
        }
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      };
    },
  },

  from(table: string) {
    return new QueryBuilder(table);
  },

  storage: {
    from(bucket: string) {
      return {
        async list(_path?: string, _options?: any): Promise<{ data: Array<{ name: string; metadata?: { size?: number } }> | null; error: any }> {
          return { data: [], error: null };
        },

        async upload(filePath: string, file: File | Blob | Buffer, options?: any) {
          try {
            const token = getStoredToken();
            const formData = new FormData();
            formData.append("file", file as any);
            formData.append("path", filePath);
            if (options?.contentType) formData.append("contentType", options.contentType);

            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`${DDS_API_URL}/documents/upload`, {
              method: "POST",
              headers,
              body: formData,
            });
            const data = await res.json();
            if (!res.ok) return { data: null, error: { message: data.error || "Upload failed" } };
            return { data: { path: filePath, ...data }, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err.message || "Upload error" } };
          }
        },

        async createSignedUrl(filePath: string, _expiresIn = 3600, _options?: any) {
          if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
            return { data: { signedUrl: filePath }, error: null };
          }
          const signedUrl = `${DDS_API_URL}/documents/download/${encodeURIComponent(filePath)}`;
          return { data: { signedUrl }, error: null };
        },

        async remove(paths: string[]) {
          try {
            const token = getStoredToken();
            for (const p of paths) {
              await fetch(`${DDS_API_URL}/documents/${encodeURIComponent(p)}`, {
                method: "DELETE",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
            }
            return { data: paths, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err.message } };
          }
        },
      };
    },
  },

  async rpc(fnName: string, args?: any): Promise<{ data: any; error: any }> {
    try {
      if (fnName === "reserve_document_bytes") {
        return {
          data: {
            used_bytes: args?.requested_bytes || 0,
            remaining_bytes: 2097152,
            limit_bytes: 2097152,
            warning: false,
          },
          error: null,
        };
      }
      if (fnName === "release_document_bytes") {
        return { data: { released: args?.released_bytes || 0, remaining_bytes: 2097152 }, error: null };
      }
      return { data: { remaining_bytes: 2097152 }, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  },

  channel(name: string, _options?: any) {
    return new RealtimeChannel(name);
  },

  getChannels(): any[] {
    return [];
  },

  removeChannel(_channel: any) {
    return Promise.resolve("ok");
  },
};
