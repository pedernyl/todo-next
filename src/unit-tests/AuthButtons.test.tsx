import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "next-auth/react";
import AuthButtons from "../components/AuthButtons";
import { render } from "@testing-library/react";
import { useGlobalBlockingLoader } from "../context/GlobalBlockingLoaderContext";

vi.mock("next-auth/react", () => ({
            useSession: vi.fn(() => ({ data: null })),
}));

vi.mock("../context/GlobalBlockingLoaderContext", () => ({
            useGlobalBlockingLoader: vi.fn(() => ({ })),
}));
        

describe("AuthButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGlobalBlockingLoader).mockReturnValueOnce({ runBlocking: vi.fn() } as any);
     
  });

    it("renders sign-in button when not logged in", () => {
        vi.mocked(useSession).mockReturnValueOnce({ data: null } as any);
        const { getByTestId } = render(<AuthButtons />);
        expect(getByTestId("auth-logged-out-container")).toBeInTheDocument();
    });

    it("AuthButtons calls update when user.id is not present in session", () => {
        const mockUpdate = vi.fn();
        vi.mocked(useSession).mockReturnValueOnce(
            { data: { user: { name: "Test User", email: "test@example.com" } }, 
            update: mockUpdate } as any
        );
        render(<AuthButtons />);

        expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it("does not call update when user.id is present in session", () => {
        const mockUpdate = vi.fn();
        vi.mocked(useSession).mockReturnValueOnce(
            { data: { 
                user: { 
                    name: "Test User", email: "test@example.com", id: 1 
                } 
            }, update: mockUpdate } as any
        );

        render(<AuthButtons />);

        expect(mockUpdate).not.toHaveBeenCalled();
    });
});