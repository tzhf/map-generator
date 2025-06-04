import { ref, type Ref, watch, onUnmounted } from 'vue'

function isElementAnimated(el: HTMLElement): boolean {
  const { animationName, animationDuration } = getComputedStyle(el)
  return animationName !== 'none' && parseFloat(animationDuration) > 0
}

function getAnimatedElements(root: HTMLElement, children = false): HTMLElement[] {
  const elements = children
    ? [root, ...(Array.from(root.querySelectorAll('[data-part]')) as HTMLElement[])]
    : [root]
  return elements.filter(isElementAnimated)
}

/**
 * Delays unmounting of a component until its exit animation completes.
 *
 * Useful when using `v-if` to conditionally render an element that has CSS animations.
 * Ensures the component remains in the DOM until the `animationend` event is triggered.
 *
 * @param target - Ref to the root element to watch for.
 * @param isVisible - Reactive flag controlling visibility (e.g. from v-model).
 * @param options - Optional settings:
 * - children: if true, checks for animated child elements as well (default: false)
 * @returns `shouldRender` - A ref for controlling actual rendering with `v-if`.
 */
export function useAnimatedVisibility(
  target: Ref<HTMLElement | null>,
  isVisible: Ref<boolean>,
  options: { children?: boolean } = {},
) {
  const { children = false } = options
  const shouldRender = ref(isVisible.value)

  let currentId = 0
  const removeListeners: (() => void)[] = []

  watch(isVisible, (visible) => {
    const el = target.value
    const thisId = ++currentId

    // Clear previous listeners
    removeListeners.forEach((off) => off())
    removeListeners.length = 0

    if (visible) {
      shouldRender.value = true
      return
    }

    if (!el) {
      shouldRender.value = false
      return
    }

    const animatedElements = getAnimatedElements(el, children)
    let remaining = animatedElements.length

    if (remaining === 0) {
      shouldRender.value = false
      return
    }

    animatedElements.forEach((element) => {
      const onEnd = (event: AnimationEvent) => {
        if (event.target !== element) return
        element.removeEventListener('animationend', onEnd)

        remaining--
        if (remaining === 0 && currentId === thisId) {
          shouldRender.value = false
        }
      }
      element.addEventListener('animationend', onEnd)
      removeListeners.push(() => element.removeEventListener('animationend', onEnd))
    })
  })

  onUnmounted(() => {
    removeListeners.forEach((off) => off())
  })

  return { shouldRender }
}
