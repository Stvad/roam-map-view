import { useEffect, useRef } from "react";
import { renderNativeBlock } from "./renderNativeBlock";

type Props = {
  uid: string;
  fallbackText?: string;
};

export function NativeBlock({ uid, fallbackText }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    renderNativeBlock(ref.current, uid, fallbackText);

    return () => {
      if (ref.current) {
        ref.current.innerHTML = "";
      }
    };
  }, [uid, fallbackText]);

  return <div ref={ref} />;
}
