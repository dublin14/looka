//@ts-nocheck

/*
 * HSDropdown
 * @version: 2.5.1
 * @author: Preline Labs Ltd.
 * @license: Licensed under MIT and Preline UI Fair Use License (https://preline.co/docs/license.html)
 * Copyright 2025 Preline Labs Ltd.
 */

import {
  getClassProperty,
  getClassPropertyAlt,
  isIOS,
  isIpadOS,
  dispatch,
  afterTransition,
  menuSearchHistory,
} from "node_modules/preline/src/utils";
import type { IMenuSearchHistory } from "node_modules/preline/src/utils/interfaces";

import type { PositioningStrategy } from "@popperjs/core";
import { createPopper } from "@popperjs/core";

import type {
  IDropdown,
  IHTMLElementPopper,
} from "node_modules/preline/src/plugins/dropdown/interfaces";
import HSBasePlugin from "node_modules/preline/src/plugins/base-plugin";
import type { ICollectionItem } from "node_modules/preline/src/interfaces";

import {
  POSITIONS,
  DROPDOWN_ACCESSIBILITY_KEY_SET,
} from "node_modules/preline/src/constants";

class HSDropdown
  extends HSBasePlugin<{}, IHTMLElementPopper>
  implements IDropdown
{
  private static history: IMenuSearchHistory;
  private readonly toggle: HTMLElement | null;
  private readonly closers: HTMLElement[] | null;
  public menu: HTMLElement | null;
  private eventMode: string;
  private closeMode: string;
  private animationInProcess: boolean;

  constructor(el: IHTMLElementPopper, options?: {}, events?: {}) {
    super(el, options, events);

    this.toggle =
      this.el.querySelector(":scope > .hs-dropdown-toggle") ||
      this.el.querySelector(
        ":scope > .hs-dropdown-toggle-wrapper > .hs-dropdown-toggle",
      ) ||
      (this.el.children[0] as HTMLElement);
    this.closers =
      Array.from(this.el.querySelectorAll(":scope .hs-dropdown-close")) || null;
    this.menu = this.el.querySelector(":scope > .hs-dropdown-menu");
    this.eventMode = getClassProperty(this.el, "--trigger", "click");
    this.closeMode = getClassProperty(this.el, "--auto-close", "true");
    this.animationInProcess = false;

    if (this.toggle && this.menu) this.init();
  }

  private init() {
    this.createCollection(window.$hsDropdownCollection, this);

    if ((this.toggle as HTMLButtonElement).disabled) return false;

    if (this.toggle) this.buildToggle();
    if (this.menu) this.buildMenu();
    if (this.closers) this.buildClosers();

    if (!isIOS() && !isIpadOS()) {
      this.el.addEventListener("mouseenter", () => this.onMouseEnterHandler());
      this.el.addEventListener("mouseleave", () => this.onMouseLeaveHandler());
    }
  }

  resizeHandler() {
    this.eventMode = getClassProperty(this.el, "--trigger", "click");
    this.closeMode = getClassProperty(this.el, "--auto-close", "true");
  }

  private buildToggle() {
    if (this?.toggle?.ariaExpanded) {
      if (this.el.classList.contains("open")) this.toggle.ariaExpanded = "true";
      else this.toggle.ariaExpanded = "false";
    }

    this.toggle.addEventListener("click", (evt) => this.onClickHandler(evt));
  }

  private buildMenu() {
    this.menu.role = "menu";
  }

  private buildClosers() {
    this.closers.forEach((el: HTMLButtonElement) => {
      el.addEventListener("click", () => this.close());
    });
  }

  private onClickHandler(evt: Event) {
    if (
      this.el.classList.contains("open") &&
      !this.menu.classList.contains("hidden")
    ) {
      this.close();
    } else {
      this.open();
    }
  }

  private onMouseEnterHandler() {
    if (this.eventMode !== "hover") return false;

    if (this.el._popper) this.forceClearState();

    if (
      !this.el.classList.contains("open") &&
      this.menu.classList.contains("hidden")
    ) {
      this.open();
    }
  }

  private onMouseLeaveHandler() {
    if (this.eventMode !== "hover") return false;

    if (
      this.el.classList.contains("open") &&
      !this.menu.classList.contains("hidden")
    ) {
      this.close();
    }
  }

  private destroyPopper() {
    this.menu.classList.remove("block");
    this.menu.classList.add("hidden");

    this.menu.style.inset = null;
    this.menu.style.position = null;

    if (this.el && this.el._popper) this.el._popper.destroy();

    this.animationInProcess = false;
  }

  private absoluteStrategyModifiers() {
    return [
      {
        name: "applyStyles",
        fn: (data: any) => {
          const strategy = (
            window.getComputedStyle(this.el).getPropertyValue("--strategy") ||
            "absolute"
          ).replace(" ", "");
          const adaptive = (
            window.getComputedStyle(this.el).getPropertyValue("--adaptive") ||
            "adaptive"
          ).replace(" ", "");

          data.state.elements.popper.style.position = strategy;
          data.state.elements.popper.style.transform =
            adaptive === "adaptive" ? data.state.styles.popper.transform : null;
          data.state.elements.popper.style.top = null;
          data.state.elements.popper.style.bottom = null;
          data.state.elements.popper.style.left = null;
          data.state.elements.popper.style.right = null;
          data.state.elements.popper.style.margin = 0;
        },
      },
    ];
  }

  // Public methods
  public open() {
    if (this.el.classList.contains("open")) return false;

    if (this.animationInProcess) return false;

    this.animationInProcess = true;

    const placement = (
      window.getComputedStyle(this.el).getPropertyValue("--placement") || ""
    ).replace(" ", "");
    const flip = (
      window.getComputedStyle(this.el).getPropertyValue("--flip") || "true"
    ).replace(" ", "");
    const strategy = (
      window.getComputedStyle(this.el).getPropertyValue("--strategy") || "fixed"
    ).replace(" ", "") as PositioningStrategy;
    const offset = parseInt(
      (
        window.getComputedStyle(this.el).getPropertyValue("--offset") || "10"
      ).replace(" ", ""),
    );
    const gpuAcceleration = (
      window.getComputedStyle(this.el).getPropertyValue("--gpu-acceleration") ||
      "true"
    ).replace(" ", "");

    if (strategy !== ("static" as PositioningStrategy)) {
      this.el._popper = createPopper(this.el, this.menu, {
        placement: POSITIONS[placement] || "bottom-start",
        strategy: strategy,
        modifiers: [
          ...(strategy !== "fixed" ? this.absoluteStrategyModifiers() : []),
          {
            name: "flip",
            enabled: flip === "true",
          },
          {
            name: "offset",
            options: {
              offset: [0, offset],
            },
          },
          {
            name: "computeStyles",
            options: {
              adaptive: strategy !== "fixed" ? false : true,
              gpuAcceleration: gpuAcceleration === "true" ? true : false,
            },
          },
        ],
      });
    }

    this.menu.style.margin = null;

    this.menu.classList.remove("hidden");
    this.menu.classList.add("block");

    setTimeout(() => {
      if (this?.toggle?.ariaExpanded) this.toggle.ariaExpanded = "true";
      this.el.classList.add("open");

      this.animationInProcess = false;
    });

    this.fireEvent("open", this.el);
    dispatch("open.hs.dropdown", this.el, this.el);
  }

  public close(isAnimated = true) {
    if (this.animationInProcess || !this.el.classList.contains("open"))
      return false;

    const clearAfterClose = () => {
      this.menu.style.margin = null;

      if (this?.toggle?.ariaExpanded) this.toggle.ariaExpanded = "false";
      this.el.classList.remove("open");

      this.fireEvent("close", this.el);
      dispatch("close.hs.dropdown", this.el, this.el);
    };

    this.animationInProcess = true;

    if (isAnimated) {
      const el: HTMLElement =
        this.el.querySelector("[data-hs-dropdown-transition]") || this.menu;

      afterTransition(el, () => this.destroyPopper());
    } else this.destroyPopper();

    clearAfterClose();
  }

  public forceClearState() {
    this.destroyPopper();
    this.menu.style.margin = null;
    this.el.classList.remove("open");
  }

  // Static methods
  static getInstance(target: HTMLElement | string, isInstance?: boolean) {
    const elInCollection = window.$hsDropdownCollection.find(
      (el) =>
        el.element.el ===
        (typeof target === "string" ? document.querySelector(target) : target),
    );

    return elInCollection
      ? isInstance
        ? elInCollection
        : elInCollection.element.el
      : null;
  }

  static autoInit() {
    if (!window.$hsDropdownCollection) window.$hsDropdownCollection = [];

    document
      .querySelectorAll(".hs-dropdown:not(.--prevent-on-load-init)")
      .forEach((el: IHTMLElementPopper) => {
        if (
          !window.$hsDropdownCollection.find(
            (elC) => (elC?.element?.el as HTMLElement) === el,
          )
        )
          new HSDropdown(el);
      });

    if (window.$hsDropdownCollection) {
      document.addEventListener("keydown", (evt) =>
        HSDropdown.accessibility(evt),
      );

      window.addEventListener("click", (evt) => {
        const evtTarget = evt.target;

        HSDropdown.closeCurrentlyOpened(evtTarget as HTMLElement);
      });

      let prevWidth = window.innerWidth;
      window.addEventListener("resize", () => {
        if (window.innerWidth !== prevWidth) {
          prevWidth = innerWidth;
          HSDropdown.closeCurrentlyOpened(null, false);
        }
      });
    }
  }

  static open(target: HTMLElement) {
    const elInCollection = window.$hsDropdownCollection.find(
      (el) =>
        el.element.el ===
        (typeof target === "string" ? document.querySelector(target) : target),
    );

    if (
      elInCollection &&
      elInCollection.element.menu.classList.contains("hidden")
    )
      elInCollection.element.open();
  }

  static close(target: HTMLElement) {
    const elInCollection = window.$hsDropdownCollection.find(
      (el) =>
        el.element.el ===
        (typeof target === "string" ? document.querySelector(target) : target),
    );

    if (
      elInCollection &&
      !elInCollection.element.menu.classList.contains("hidden")
    ) {
      elInCollection.element.close();
    }
  }

  // Accessibility methods
  static accessibility(evt: KeyboardEvent) {
    this.history = menuSearchHistory;

    const target: ICollectionItem<HSDropdown> | null =
      window.$hsDropdownCollection.find((el) =>
        el.element.el.classList.contains("open"),
      );

    if (
      target &&
      (DROPDOWN_ACCESSIBILITY_KEY_SET.includes(evt.code) ||
        (evt.code.length === 4 &&
          evt.code[evt.code.length - 1].match(/^[A-Z]*$/))) &&
      !evt.metaKey &&
      !target.element.menu.querySelector("input:focus") &&
      !target.element.menu.querySelector("textarea:focus")
    ) {
      switch (evt.code) {
        case "Escape":
          if (!target.element.menu.querySelector(".hs-select.active")) {
            evt.preventDefault();
            this.onEscape(evt);
          }
          break;
        case "Enter":
          if (
            !target.element.menu.querySelector(".hs-select button:focus") &&
            !target.element.menu.querySelector(".hs-collapse-toggle:focus")
          ) {
            this.onEnter(evt);
          }
          break;
        case "ArrowUp":
          evt.preventDefault();
          evt.stopImmediatePropagation();
          this.onArrow();
          break;
        case "ArrowDown":
          evt.preventDefault();
          evt.stopImmediatePropagation();
          this.onArrow(false);
          break;
        case "Home":
          evt.preventDefault();
          evt.stopImmediatePropagation();
          this.onStartEnd();
          break;
        case "End":
          evt.preventDefault();
          evt.stopImmediatePropagation();
          this.onStartEnd(false);
          break;
        default:
          // evt.preventDefault();
          this.onFirstLetter(evt.key);
          break;
      }
    }
  }

  static onEscape(evt: KeyboardEvent) {
    const dropdown = (evt.target as HTMLElement).closest(".hs-dropdown.open");

    if (window.$hsDropdownCollection.find((el) => el.element.el === dropdown)) {
      const target = window.$hsDropdownCollection.find(
        (el) => el.element.el === dropdown,
      );

      if (target) {
        target.element.close();
        target.element.toggle.focus();
      }
    } else {
      this.closeCurrentlyOpened();
    }
  }

  static onEnter(evt: KeyboardEvent) {
    const dropdown = (evt.target as HTMLElement).parentElement;

    if (window.$hsDropdownCollection.find((el) => el.element.el === dropdown)) {
      evt.preventDefault();

      const target = window.$hsDropdownCollection.find(
        (el) => el.element.el === dropdown,
      );

      if (target) target.element.open();
    }
  }

  static onArrow(isArrowUp = true) {
    const target = window.$hsDropdownCollection.find((el) =>
      el.element.el.classList.contains("open"),
    );

    if (target) {
      const menu = target.element.menu;

      if (!menu) return false;

      const preparedLinks = isArrowUp
        ? Array.from(
            menu.querySelectorAll(
              "a:not([hidden]), .hs-dropdown > button:not([hidden])",
            ),
          ).reverse()
        : Array.from(
            menu.querySelectorAll(
              "a:not([hidden]), .hs-dropdown > button:not([hidden])",
            ),
          );

      const links = preparedLinks.filter(
        (el: any) => !el.classList.contains("disabled"),
      );
      const current = menu.querySelector("a:focus, button:focus");
      let currentInd = links.findIndex((el: any) => el === current);

      if (currentInd + 1 < links.length) {
        currentInd++;
      }

      (links[currentInd] as HTMLButtonElement | HTMLAnchorElement).focus();
    }
  }

  static onStartEnd(isStart = true) {
    const target = window.$hsDropdownCollection.find((el) =>
      el.element.el.classList.contains("open"),
    );

    if (target) {
      const menu = target.element.menu;

      if (!menu) return false;

      const preparedLinks = isStart
        ? Array.from(menu.querySelectorAll("a"))
        : Array.from(menu.querySelectorAll("a")).reverse();
      const links = preparedLinks.filter(
        (el: any) => !el.classList.contains("disabled"),
      );

      if (links.length) {
        links[0].focus();
      }
    }
  }

  static onFirstLetter(code: string) {
    const target = window.$hsDropdownCollection.find((el) =>
      el.element.el.classList.contains("open"),
    );

    if (target) {
      const menu = target.element.menu;

      if (!menu) return false;

      const links = Array.from(menu.querySelectorAll("a"));
      const getCurrentInd = () =>
        links.findIndex(
          (el, i) =>
            el.innerText.toLowerCase().charAt(0) === code.toLowerCase() &&
            this.history.existsInHistory(i),
        );
      let currentInd = getCurrentInd();

      if (currentInd === -1) {
        this.history.clearHistory();
        currentInd = getCurrentInd();
      }

      if (currentInd !== -1) {
        links[currentInd].focus();
        this.history.addHistory(currentInd);
      }
    }
  }

  static closeCurrentlyOpened(
    evtTarget: HTMLElement | null = null,
    isAnimated = true,
  ) {
    const parent =
      evtTarget &&
      evtTarget.closest(".hs-dropdown") &&
      evtTarget.closest(".hs-dropdown").parentElement.closest(".hs-dropdown")
        ? evtTarget
            .closest(".hs-dropdown")
            .parentElement.closest(".hs-dropdown")
        : null;
    let currentlyOpened = parent
      ? window.$hsDropdownCollection.filter(
          (el) =>
            el.element.el.classList.contains("open") &&
            el.element.menu
              .closest(".hs-dropdown")
              .parentElement.closest(".hs-dropdown") === parent,
        )
      : window.$hsDropdownCollection.filter((el) =>
          el.element.el.classList.contains("open"),
        );

    if (
      evtTarget &&
      evtTarget.closest(".hs-dropdown") &&
      getClassPropertyAlt(evtTarget.closest(".hs-dropdown"), "--auto-close") ===
        "inside"
    ) {
      currentlyOpened = currentlyOpened.filter(
        (el) => el.element.el !== evtTarget.closest(".hs-dropdown"),
      );
    }

    if (currentlyOpened) {
      currentlyOpened.forEach((el) => {
        if (
          el.element.closeMode === "false" ||
          el.element.closeMode === "outside"
        )
          return false;

        el.element.close(isAnimated);
      });
    }
  }

  // Backward compatibility
  static on(evt: string, target: HTMLElement, cb: Function) {
    const elInCollection = window.$hsDropdownCollection.find(
      (el) =>
        el.element.el ===
        (typeof target === "string" ? document.querySelector(target) : target),
    );

    if (elInCollection) elInCollection.element.events[evt] = cb;
  }
}

declare global {
  interface Window {
    HSDropdown: Function;
    $hsDropdownCollection: ICollectionItem<HSDropdown>[];
  }
}

window.addEventListener("load", () => {
  HSDropdown.autoInit();

  // Uncomment for debug
  // console.log('Dropdown collection:', window.$hsDropdownCollection);
});

window.addEventListener("resize", () => {
  if (!window.$hsDropdownCollection) window.$hsDropdownCollection = [];

  window.$hsDropdownCollection.forEach((el) => el.element.resizeHandler());
});

if (typeof window !== "undefined") {
  window.HSDropdown = HSDropdown;
}

export default HSDropdown;
