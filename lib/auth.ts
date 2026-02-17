export type UserRole = "admin" | "operador" | "cliente" | "transportista"

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  cliente_id: string | null
  carrier_id: string | null
  created_at: string
}

// Which roles can access which routes
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  "/": ["admin", "operador", "cliente", "transportista"],
  "/ocean": ["admin", "operador", "cliente"],
  "/land": ["admin", "operador", "cliente", "transportista"],
  "/clientes": ["admin", "operador"],
  "/carriers": ["admin", "operador"],
  "/admin": ["admin"],
}

export const CAN_CREATE_FREIGHT: UserRole[] = ["admin", "operador"]
export const CAN_EDIT_FREIGHT: UserRole[] = ["admin", "operador"]
export const CAN_DELETE_FREIGHT: UserRole[] = ["admin", "operador"]
export const CAN_UPLOAD_DOCS: UserRole[] = ["admin", "operador", "transportista"]
export const CAN_MANAGE_USERS: UserRole[] = ["admin"]
