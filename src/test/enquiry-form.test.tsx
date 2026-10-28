import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnquiryForm } from "@/components/enquiry-form";

const { insert, select } = vi.hoisted(() => ({ insert: vi.fn(), select: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert, select }) },
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function fillForm() {
  fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "Test Member" } });
  fireEvent.change(screen.getByLabelText(/Phone/), { target: { value: "9876543210" } });
}

describe("Enquiry submissions", () => {
  it("blocks invalid input before submitting", () => {
    render(<EnquiryForm gymId="gym-id" plans={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Send enquiry" }));
    expect(insert).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Full name/).getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(screen.getByLabelText(/Full name/));
  });

  it("inserts without requesting returned rows and prevents duplicate submissions", async () => {
    let finish: ((result: { error: null }) => void) | undefined;
    insert.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<EnquiryForm gymId="gym-id" plans={[]} />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Send enquiry" }));
    fireEvent.submit(screen.getByRole("form", { name: "Gym enquiry" }));
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith({ gym_id: "gym-id", kind: "join", full_name: "Test Member", phone: "9876543210", email: null, plan_id: null, message: null });
    expect(select).not.toHaveBeenCalled();
    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
    finish?.({ error: null });
    await waitFor(() => expect((screen.getByLabelText(/Full name/) as HTMLInputElement).value).toBe(""));
  });

  it("keeps entered details and enables retry after a network failure", async () => {
    insert.mockRejectedValue(new Error("Network unavailable"));
    render(<EnquiryForm gymId="gym-id" plans={[]} />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Send enquiry" }));
    await screen.findByRole("alert");
    expect((screen.getByLabelText(/Full name/) as HTMLInputElement).value).toBe("Test Member");
    expect(screen.getByRole("button", { name: "Send enquiry" }).hasAttribute("disabled")).toBe(false);
  });
});