import { describe, expect, it } from "vitest";

/**
 * Model of the PostgreSQL protect_profile_role() trigger behavior:
 *
 * IF TG_OP = 'UPDATE' THEN
 *   IF NEW.role IS DISTINCT FROM OLD.role THEN
 *     IF NOT is_admin THEN
 *       RAISE EXCEPTION 'Access denied: only administrators can modify user roles.';
 *     END IF;
 *   END IF;
 * ELSIF TG_OP = 'INSERT' THEN
 *   IF NEW.role IS NOT NULL AND NEW.role <> 'citizen' THEN
 *     IF NOT is_admin THEN
 *       NEW.role := 'citizen';
 *     END IF;
 *   END IF;
 * END IF;
 */
interface ProfileRow {
  id: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  role: "citizen" | "authority" | "admin";
}

function simulateProfileTrigger(
  op: "INSERT" | "UPDATE",
  oldRow: ProfileRow | null,
  newRow: Partial<ProfileRow> & { id: string },
  callerIsAdmin: boolean,
): ProfileRow {
  if (op === "INSERT") {
    let role = newRow.role || "citizen";
    if (role !== "citizen" && !callerIsAdmin) {
      role = "citizen"; // Forcibly reset on untrusted insert
    }
    return {
      id: newRow.id,
      full_name: newRow.full_name || "",
      phone: newRow.phone ?? null,
      avatar_url: newRow.avatar_url ?? null,
      role,
    };
  }

  if (op === "UPDATE") {
    if (!oldRow) throw new Error("oldRow required for UPDATE");
    const roleIsChanging = newRow.role !== undefined && newRow.role !== oldRow.role;

    if (roleIsChanging && !callerIsAdmin) {
      throw new Error("Access denied: only administrators can modify user roles.");
    }

    return {
      ...oldRow,
      ...newRow,
      role: roleIsChanging && callerIsAdmin ? (newRow.role as ProfileRow["role"]) : oldRow.role,
    };
  }

  throw new Error("Invalid operation");
}

describe("Database Trigger & RLS: Profile Role Protection", () => {
  const citizenProfile: ProfileRow = {
    id: "user-1234",
    full_name: "Rahul Sharma",
    phone: "9876543210",
    avatar_url: null,
    role: "citizen",
  };

  it("permits regular user to update their name and phone number", () => {
    const updated = simulateProfileTrigger(
      "UPDATE",
      citizenProfile,
      { id: citizenProfile.id, full_name: "Rahul S. Sharma", phone: "9876543219" },
      false, // caller is NOT admin
    );

    expect(updated.full_name).toBe("Rahul S. Sharma");
    expect(updated.phone).toBe("9876543219");
    expect(updated.role).toBe("citizen");
  });

  it("permits regular user update when role is explicitly passed identical to existing role", () => {
    const updated = simulateProfileTrigger(
      "UPDATE",
      citizenProfile,
      { id: citizenProfile.id, role: "citizen" },
      false, // caller is NOT admin
    );

    expect(updated.role).toBe("citizen");
  });

  it("CRITICAL TEST: strictly blocks normal user from promoting themselves to admin", () => {
    expect(() =>
      simulateProfileTrigger(
        "UPDATE",
        citizenProfile,
        { id: citizenProfile.id, role: "admin" }, // Attacker payload
        false, // caller is NOT admin
      ),
    ).toThrow("Access denied: only administrators can modify user roles.");
  });

  it("CRITICAL TEST: strictly blocks normal user from changing role to authority", () => {
    expect(() =>
      simulateProfileTrigger(
        "UPDATE",
        citizenProfile,
        { id: citizenProfile.id, role: "authority" },
        false, // caller is NOT admin
      ),
    ).toThrow("Access denied: only administrators can modify user roles.");
  });

  it("permits verified administrator to promote or reassign user roles", () => {
    const updated = simulateProfileTrigger(
      "UPDATE",
      citizenProfile,
      { id: citizenProfile.id, role: "admin" },
      true, // caller IS admin
    );

    expect(updated.role).toBe("admin");
  });

  it("neutralizes forged role on profile insert by normal user to citizen default", () => {
    const inserted = simulateProfileTrigger(
      "INSERT",
      null,
      { id: "new-user-5678", full_name: "Sneha Sen", role: "admin" },
      false, // caller is NOT admin
    );

    expect(inserted.role).toBe("citizen");
  });

  it("allows verified administrator or service role to insert pre-assigned roles", () => {
    const inserted = simulateProfileTrigger(
      "INSERT",
      null,
      { id: "admin-user-7890", full_name: "Municipal Admin", role: "admin" },
      true, // caller IS admin
    );

    expect(inserted.role).toBe("admin");
  });
});
