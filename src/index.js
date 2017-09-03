/* @flow */

import React, { Component } from 'react';
// import ResizeObserver from 'resize-observer-polyfill';
// import debounce from 'lodash.debounce';
import Resizer from './resizer';

import type { Direction, OnStartCallback } from './resizer';

const userSelectNone = {
  userSelect: 'none',
  MozUserSelect: 'none',
  WebkitUserSelect: 'none',
  MsUserSelect: 'none',
};

const userSelectAuto = {
  userSelect: 'auto',
  MozUserSelect: 'auto',
  WebkitUserSelect: 'auto',
  MsUserSelect: 'auto',
};

export type Style = {
  [key: string]: string;
}

export type Enable = {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
  topRight?: boolean;
  bottomRight?: boolean;
  bottomLeft?: boolean;
  topLeft?: boolean;
}

export type HandleStyles = {
  top?: any;
  right?: any;
  bottom?: any;
  left?: any;
  topRight?: any;
  bottomRight?: any;
  bottomLeft?: any;
  topLeft?: any;
}

export type HandleClassName = {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  topRight?: string;
  bottomRight?: string;
  bottomLeft?: string;
  topLeft?: string;
}

export type Size = {
  width?: string | number;
  height?: string | number;
}

type NumberSize = {
  width: number;
  height: number;
}

export type Callback = (
  event: MouseEvent | TouchEvent,
  direction: Direction,
  refToElement: HTMLElement,
  delta: NumberSize,
) => void;

export type ResizeStartCallBack = (
  e: SyntheticMouseEvent<HTMLDivElement> | SyntheticTouchEvent<HTMLDivElement>,
  dir: Direction,
  refToElement: HTMLElement,
) => void;

export type ResizableProps = {
  style?: any;
  className?: string;
  extendsProps?: any;
  grid?: [number, number];
  bounds?: 'parent' | 'window' | HTMLElement;
  width?: string | number;
  height?: string | number;
  minWidth?: string | number;
  minHeight?: string | number;
  maxWidth?: string | number;
  maxHeight?: string | number;
  lockAspectRatio?: boolean;
  enable?: Enable;
  handleStyles?: HandleStyles;
  handleClasses?: HandleClassName;
  handleWrapperStyle?: { [key: string]: string };
  handleWrapperClass?: string;
  children?: React$Node;
  onResizeStart?: ResizeStartCallBack;
  onResize?: Callback;
  onResizeStop?: Callback;
}

type State = {
  isResizing: boolean;
  direction: Direction;
  original: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  width: number | string;
  height: number | string;
}

const clamp = (n: number, min: number, max: number): number => Math.max(Math.min(n, max), min);
const snap = (n: number, size: number): number => Math.round(n / size) * size;

let baseSizeId = 0;

export default class Resizable extends Component<ResizableProps, State> {
  resizable: HTMLElement;
  onTouchMove: Callback;
  onMouseMove: Callback;
  onMouseUp: Callback;
  onResizeStart: OnStartCallback;
  baseSizeId: string;

  static defaultProps = {
    onResizeStart: () => { },
    onResize: () => { },
    onResizeStop: () => { },
    enable: {
      top: true,
      right: true,
      bottom: true,
      left: true,
      topRight: true,
      bottomRight: true,
      bottomLeft: true,
      topLeft: true,
    },
    style: {},
    grid: [1, 1],
    lockAspectRatio: false,
  }

  constructor(props: ResizableProps) {
    super(props);
    const { width, height } = props;
    this.state = {
      isResizing: false,
      width: typeof width === 'undefined' ? 'auto' : width,
      height: typeof height === 'undefined' ? 'auto' : height,
      direction: 'right',
      original: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
    };
    this.onResizeStart = this.onResizeStart.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.baseSizeId = `__resizable${baseSizeId}`;
    baseSizeId += 1;

    if (typeof window !== 'undefined') {
      window.addEventListener('mouseup', this.onMouseUp);
      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('touchmove', this.onMouseMove);
      window.addEventListener('touchend', this.onMouseUp);
    }
  }

  getParentSize(): { width: number, height: number } {
    const base = (document.getElementById(this.baseSizeId): any);
    return {
      width: (base: HTMLDivElement).offsetWidth,
      height: (base: HTMLDivElement).offsetHeight,
    };
  }

  componentDidMount() {
    const size = this.size;
    // const debounced = debounce(() => {
    // this.setState(this.style);
    // }, 0);
    // const ro = new ResizeObserver(debounced);
    // ro.observe(this.resizable.parentNode);
    // If props.width or height is not defined, set default size when mounted.
    this.setState({
      width: this.state.width || size.width,
      height: this.state.height || size.height,
    });
    const element = document.createElement('div');
    element.id = this.baseSizeId;
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.position = 'relative';
    element.style.left = '-9999px';
    const parent = this.resizable.parentNode;
    if (!(parent instanceof HTMLElement)) return;
    parent.appendChild(element);
  }

  componentWillReceiveProps({ width, height }: ResizableProps) {
    if (width !== this.props.width) {
      this.setState({ width });
    }
    if (height !== this.props.height) {
      this.setState({ height });
    }
  }

  componentWillUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mouseup', this.onMouseUp);
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('touchmove', this.onMouseMove);
      window.removeEventListener('touchend', this.onMouseUp);
    }
  }

  onResizeStart(
    event: SyntheticMouseEvent<HTMLDivElement> | SyntheticTouchEvent<HTMLDivElement>,
    direction: Direction,
  ) {
    let clientX = 0;
    let clientY = 0;
    if (event.nativeEvent instanceof MouseEvent) {
      clientX = event.nativeEvent.clientX;
      clientY = event.nativeEvent.clientY;
    } else if (event.nativeEvent instanceof TouchEvent) {
      clientX = event.nativeEvent.touches[0].clientX;
      clientY = event.nativeEvent.touches[0].clientY;
    }
    if (this.props.onResizeStart) {
      this.props.onResizeStart(event, direction, this.resizable);
    }
    const size = this.size;
    this.setState({
      original: {
        x: clientX,
        y: clientY,
        width: size.width,
        height: size.height,
      },
      isResizing: true,
      direction,
    });
  }

  onMouseMove(event: MouseEvent | TouchEvent) {
    if (!this.state.isResizing) return;
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    const { direction, original, width, height } = this.state;
    const { lockAspectRatio } = this.props;
    let { maxWidth, maxHeight, minWidth, minHeight } = this.props;

    // TODO: refactor
    const parentSize = this.getParentSize();
    if (maxWidth && typeof maxWidth === 'string' && maxWidth.endsWith('%')) {
      const ratio = Number(maxWidth.replace('%', '')) / 100;
      maxWidth = parentSize.width * ratio;
    }
    if (maxHeight && typeof maxHeight === 'string' && maxHeight.endsWith('%')) {
      const ratio = Number(maxHeight.replace('%', '')) / 100;
      maxHeight = parentSize.height * ratio;
    }
    if (minWidth && typeof minWidth === 'string' && minWidth.endsWith('%')) {
      const ratio = Number(minWidth.replace('%', '')) / 100;
      minWidth = parentSize.width * ratio;
    }
    if (minHeight && typeof minHeight === 'string' && minHeight.endsWith('%')) {
      const ratio = Number(minHeight.replace('%', '')) / 100;
      minHeight = parentSize.height * ratio;
    }
    maxWidth = typeof maxWidth === 'undefined' ? undefined : Number(maxWidth);
    maxHeight = typeof maxHeight === 'undefined' ? undefined : Number(maxHeight);
    minWidth = typeof minWidth === 'undefined' ? undefined : Number(minWidth);
    minHeight = typeof minHeight === 'undefined' ? undefined : Number(minHeight);

    const ratio = original.height / original.width;
    let newWidth = original.width;
    let newHeight = original.height;
    if (/right/i.test(direction)) {
      newWidth = original.width + (clientX - original.x);
      if (lockAspectRatio) newHeight = newWidth * ratio;
    }
    if (/left/i.test(direction)) {
      newWidth = original.width - (clientX - original.x);
      if (lockAspectRatio) newHeight = newWidth * ratio;
    }
    if (/bottom/i.test(direction)) {
      newHeight = original.height + (clientY - original.y);
      if (lockAspectRatio) newWidth = newHeight / ratio;
    }
    if (/top/i.test(direction)) {
      newHeight = original.height - (clientY - original.y);
      if (lockAspectRatio) newWidth = newHeight / ratio;
    }

    if (this.props.bounds === 'parent') {
      const parent = this.resizable.parentNode;
      if (parent instanceof HTMLElement) {
        const parentRect = parent.getBoundingClientRect();
        const parentLeft = parentRect.left;
        const parentTop = parentRect.top;
        const { left, top } = this.resizable.getBoundingClientRect();
        const boundWidth = parent.offsetWidth + (parentLeft - left);
        const boundHeight = parent.offsetHeight + (parentTop - top);
        maxWidth = maxWidth && maxWidth < boundWidth ? maxWidth : boundWidth;
        maxHeight = maxHeight && maxHeight < boundHeight ? maxHeight : boundHeight;
      }
    } else if (this.props.bounds === 'window') {
      if (typeof window !== 'undefined') {
        const { left, top } = this.resizable.getBoundingClientRect();
        const boundWidth = window.innerWidth - left;
        const boundHeight = window.innerHeight - top;
        maxWidth = maxWidth && maxWidth < boundWidth ? maxWidth : boundWidth;
        maxHeight = maxHeight && maxHeight < boundHeight ? maxHeight : boundHeight;
      }
    } else if (this.props.bounds instanceof HTMLElement) {
      const targetRect = this.props.bounds.getBoundingClientRect();
      const targetLeft = targetRect.left;
      const targetTop = targetRect.top;
      const { left, top } = this.resizable.getBoundingClientRect();
      if (!(this.props.bounds instanceof HTMLElement)) return;
      const boundWidth = this.props.bounds.offsetWidth + (targetLeft - left);
      const boundHeight = this.props.bounds.offsetHeight + (targetTop - top);
      maxWidth = maxWidth && maxWidth < boundWidth ? maxWidth : boundWidth;
      maxHeight = maxHeight && maxHeight < boundHeight ? maxHeight : boundHeight;
    }

    const computedMinWidth = (typeof minWidth === 'undefined' || minWidth < 0) ? 0 : minWidth;
    const computedMaxWidth = (typeof maxWidth === 'undefined' || maxWidth < 0) ? newWidth : maxWidth;
    const computedMinHeight = (typeof minHeight === 'undefined' || minHeight < 0) ? 0 : minHeight;
    const computedMaxHeight = (typeof maxHeight === 'undefined' || maxHeight < 0) ? newHeight : maxHeight;

    if (lockAspectRatio) {
      const lockedMinWidth = computedMinWidth > computedMinHeight / ratio ? computedMinWidth : computedMinHeight / ratio;
      const lockedMaxWidth = computedMaxWidth < computedMaxHeight / ratio ? computedMaxWidth : computedMaxHeight / ratio;
      const lockedMinHeight = computedMinHeight > computedMinWidth * ratio ? computedMinHeight : computedMinWidth * ratio;
      const lockedMaxHeight = computedMaxHeight < computedMaxWidth * ratio ? computedMaxHeight : computedMaxWidth * ratio;
      newWidth = clamp(newWidth, lockedMinWidth, lockedMaxWidth);
      newHeight = clamp(newHeight, lockedMinHeight, lockedMaxHeight);
    } else {
      newWidth = clamp(newWidth, computedMinWidth, computedMaxWidth);
      newHeight = clamp(newHeight, computedMinHeight, computedMaxHeight);
    }
    if (this.props.grid) {
      newWidth = snap(newWidth, this.props.grid[0]);
    }
    if (this.props.grid) {
      newHeight = snap(newHeight, this.props.grid[1]);
    }

    const delta = {
      width: newWidth - original.width,
      height: newHeight - original.height,
    };

    if (width && typeof width === 'string' && width.endsWith('%')) {
      const percent = (newWidth / parentSize.width) * 100;
      newWidth = `${percent}%`;
    }

    if (height && typeof height === 'string' && height.endsWith('%')) {
      const percent = (newHeight / parentSize.height) * 100;
      newHeight = `${percent}%`;
    }

    this.setState({
      width: width !== 'auto' || typeof this.props.width === 'undefined' ? newWidth : 'auto',
      height: height !== 'auto' || typeof this.props.height === 'undefined' ? newHeight : 'auto',
    });

    if (this.props.onResize) {
      this.props.onResize(event, direction, this.resizable, delta);
    }
  }

  onMouseUp(event: MouseEvent | TouchEvent) {
    const { isResizing, direction, original } = this.state;
    if (!isResizing) return;
    const delta = {
      width: this.size.width - original.width,
      height: this.size.height - original.height,
    };
    if (this.props.onResizeStop) {
      this.props.onResizeStop(event, direction, this.resizable, delta);
    }
    this.setState({ isResizing: false });
  }

  get size(): NumberSize {
    let width = 0;
    let height = 0;
    if (typeof window !== 'undefined') {
      const style = window.getComputedStyle(this.resizable, null);
      width = +style.getPropertyValue('width').replace('px', '');
      height = +style.getPropertyValue('height').replace('px', '');
    }
    return { width, height };
  }

  setSize(size: Size) {
    this.setState({
      width: this.state.width || size.width,
      height: this.state.height || size.height,
    });
  }

  // TODO: rename 
  get style(): { width: string, height: string } {
    const size = (key: 'width' | 'height'): string => {
      if (typeof this.state[key] === 'undefined' || this.state[key] === 'auto') return 'auto';
      if (this.props[key] && this.props[key].toString().endsWith('%')) {
        if (this.state[key].toString().endsWith('%')) return this.state[key].toString();
        const parentSize = this.getParentSize();
        const value = Number(this.state[key].toString().replace('px', ''));
        const percent = (value / parentSize[key]) * 100;
        return `${percent}%`;
      }
      if (this.state[key].toString().endsWith('px')) return this.state[key].toString();
      if (this.state[key].toString().endsWith('%')) return this.state[key].toString();
      return `${this.state[key]}px`;
    };
    return {
      width: size('width'),
      height: size('height'),
    };
  }

  updateSize(size: Size) {
    this.setState({ width: size.width, height: size.height });
  }

  renderResizer(): React$Node {
    const { enable, handleStyles, handleClasses, handleWrapperStyle, handleWrapperClass } = this.props;
    if (!enable) return null;
    const resizers = Object.keys(enable).map((dir: Direction): React$Node => {
      if (enable[dir] !== false) {
        return (
          <Resizer
            key={dir}
            direction={dir}
            onResizeStart={this.onResizeStart}
            replaceStyles={handleStyles && handleStyles[dir]}
            className={handleClasses && handleClasses[dir]}
          />
        );
      }
      return null;
    });

    // #93 Wrap the resize box in span (will not break 100% width/height)
    return (
      <span
        className={handleWrapperClass}
        style={handleWrapperStyle}
      >
        {resizers}
      </span>);
  }

  render(): React$Node {
    const userSelect = this.state.isResizing ? userSelectNone : userSelectAuto;
    const { style, className } = this.props;
    return (
      <div
        ref={(c: HTMLElement) => { this.resizable = c; }}
        style={{
          position: 'relative',
          ...userSelect,
          ...style,
          ...this.style,
          maxWidth: this.props.maxWidth,
          maxHeight: this.props.maxHeight,
          minWidth: this.props.minWidth,
          minHeight: this.props.minHeight,
          boxSizing: 'border-box',
        }}
        className={className}
        {...this.props.extendsProps}
      >
        {this.props.children}
        {this.renderResizer()}
      </div>
    );
  }
}
