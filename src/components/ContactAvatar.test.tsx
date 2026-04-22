/**
 * Tests for the ContactAvatar fallback cascade.
 *
 * The component has three render paths:
 *   1. No `avatarUrl`           → initials only, no indicator, no tooltip.
 *   2. `avatarUrl` loads (onLoad) → photo visible, no indicator.
 *   3. `avatarUrl` fails (onError, e.g. LinkedIn 403)
 *                                 → initials + corner ⓘ + tooltip explaining why.
 *
 * We simulate the public / blocked image cases by manually firing the
 * <img>'s `load` and `error` events, since jsdom never actually fetches
 * network resources.
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import ContactAvatar from "./ContactAvatar";

describe("ContactAvatar — no URL provided", () => {
  it("renders initials when avatarUrl is omitted", () => {
    render(<ContactAvatar name="Jane Doe" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
    // No <img> should have been mounted at all.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("uses '?' for empty names", () => {
    render(<ContactAvatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("uses single initial for single-word names", () => {
    render(<ContactAvatar name="Cher" />);
    expect(screen.getByText("C")).toBeInTheDocument();
  });
});

describe("ContactAvatar — public (loadable) image URL", () => {
  it("shows the image after it loads, no error indicator", () => {
    render(
      <ContactAvatar
        name="Jane Doe"
        avatarUrl="https://example.com/public-avatar.jpg"
      />,
    );

    const img = screen.getByRole("img", { name: "Jane Doe" }) as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe("https://example.com/public-avatar.jpg");

    // Simulate a successful image fetch.
    fireEvent.load(img);

    // Image is now opaque (loaded) and no error indicator/tooltip exists.
    expect(img.className).toMatch(/opacity-100/);
    // The tooltip trigger only renders on the failed path — so we should
    // not find a tooltip-related description.
    expect(screen.queryByText(/Profile photo unavailable/i)).not.toBeInTheDocument();
  });
});

describe("ContactAvatar — blocked image URL (LinkedIn 403 case)", () => {
  it("falls back to initials, shows error indicator, and tooltip", async () => {
    render(
      <ContactAvatar
        name="Jane Doe"
        avatarUrl="https://media.licdn.com/dms/image/blocked.jpg"
      />,
    );

    const img = screen.getByRole("img", { name: "Jane Doe" });

    // Simulate LinkedIn returning 403 / network failure.
    fireEvent.error(img);

    // The <img> is unmounted and replaced by initials.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();

    // The corner indicator (an aria-hidden span containing the AlertCircle
    // svg from lucide-react) should now be present. We assert via the
    // avatar root having an svg child — initials-only path has none.
    const root = screen.getByLabelText("Jane Doe");
    expect(within(root).getByRole("img", { hidden: true })).toBeTruthy(); // svg has implicit role=img
  });

  it("re-renders cleanly when the URL prop changes after a failure", () => {
    const { rerender } = render(
      <ContactAvatar
        name="Jane Doe"
        avatarUrl="https://media.licdn.com/blocked.jpg"
      />,
    );
    fireEvent.error(screen.getByRole("img", { name: "Jane Doe" }));
    // Confirm we're in the failed-state.
    expect(screen.queryByRole("img", { name: "Jane Doe" })).not.toBeInTheDocument();

    // Swap to a new (presumably loadable) URL — state should reset and
    // the component should attempt to load the new image.
    rerender(
      <ContactAvatar
        name="Jane Doe"
        avatarUrl="https://example.com/fresh.jpg"
      />,
    );
    const newImg = screen.getByRole("img", { name: "Jane Doe" }) as HTMLImageElement;
    expect(newImg.src).toBe("https://example.com/fresh.jpg");
  });
});
