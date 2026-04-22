// @vitest-environment happy-dom
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
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import ContactAvatar from "./ContactAvatar";

describe("ContactAvatar — no URL provided", () => {
  it("renders initials with role=img and aria-label", () => {
    render(<ContactAvatar name="Jane Doe" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
    // Wrapper announces the name once via role="img" + aria-label.
    const wrapper = screen.getByRole("img", { name: "Jane Doe" });
    expect(wrapper.tagName).toBe("DIV");
    // No <img> element should have been mounted.
    expect(wrapper.querySelector("img")).toBeNull();
  });

  it("uses '?' for empty names", () => {
    render(<ContactAvatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("uses single initial for single-word names", () => {
    render(<ContactAvatar name="Cher" />);
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("does not announce the name twice (image alt is empty)", () => {
    // No URL → no <img> at all, but the wrapper's aria-label is the
    // single source of accessible name. We assert there's exactly one
    // accessible "Jane Doe" image element.
    render(<ContactAvatar name="Jane Doe" />);
    expect(screen.getAllByRole("img", { name: "Jane Doe" })).toHaveLength(1);
  });
});

describe("ContactAvatar — public (loadable) image URL", () => {
  it("shows the image after it loads, no error indicator", () => {
    const { container } = render(
      <ContactAvatar
        name="Jane Doe"
        avatarUrl="https://example.com/public-avatar.jpg"
      />,
    );

    // The wrapper carries the accessible name (role="img" + aria-label).
    // The inner <img> uses alt="" so it doesn't double-announce.
    const wrapper = screen.getByRole("img", { name: "Jane Doe" });
    expect(wrapper.tagName).toBe("DIV");

    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toBe("https://example.com/public-avatar.jpg");
    expect(img.alt).toBe("");

    // Simulate a successful image fetch.
    fireEvent.load(img);
    expect(img.className).toMatch(/opacity-100/);

    // No tooltip-related description on the success path.
    expect(screen.queryByText(/Profile photo unavailable/i)).not.toBeInTheDocument();
  });
});

describe("ContactAvatar — blocked image URL (LinkedIn 403 case)", () => {
  it("falls back to initials, shows error indicator, and is keyboard-focusable", () => {
    const { container } = render(
      <ContactAvatar
        name="Jane Doe"
        avatarUrl="https://media.licdn.com/dms/image/blocked.jpg"
      />,
    );

    const img = container.querySelector("img") as HTMLImageElement;
    // Simulate LinkedIn returning 403 / network failure.
    fireEvent.error(img);

    // The <img> is unmounted and replaced by initials.
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("JD")).toBeInTheDocument();

    // The avatar is now wrapped in a focusable <button> so keyboard users
    // can reach the tooltip explanation. The button's accessible name
    // includes both the contact name and a hint that there's more info.
    const button = screen.getByRole("button", { name: /Jane Doe.*Why\?/ });
    expect(button.tagName).toBe("BUTTON");
    expect(button).not.toHaveAttribute("disabled");

    // The corner ⓘ indicator svg is present inside the avatar wrapper.
    const wrapper = screen.getByRole("img", { name: "Jane Doe" });
    expect(wrapper.querySelector("svg")).not.toBeNull();
  });

  it("re-renders cleanly when the URL prop changes after a failure", () => {
    const { container, rerender } = render(
      <ContactAvatar
        name="Jane Doe"
        avatarUrl="https://media.licdn.com/blocked.jpg"
      />,
    );
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    // Confirm we're in the failed-state (no <img>, button wrapper present).
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("button", { name: /Jane Doe/ })).toBeInTheDocument();

    // Swap to a new (presumably loadable) URL — state should reset and
    // the component should attempt to load the new image, dropping the
    // failure-state button wrapper.
    rerender(
      <ContactAvatar
        name="Jane Doe"
        avatarUrl="https://example.com/fresh.jpg"
      />,
    );
    const newImg = container.querySelector("img") as HTMLImageElement;
    expect(newImg).not.toBeNull();
    expect(newImg.src).toBe("https://example.com/fresh.jpg");
    expect(screen.queryByRole("button", { name: /Jane Doe/ })).not.toBeInTheDocument();
  });
});
