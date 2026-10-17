import Phaser from 'phaser';

/** Fades the scene out, optionally stopping other scenes, then starts `key`. */
export function fadeToScene(scene: Phaser.Scene, key: string, data?: object, stopKeys: string[] = [], duration = 220): void {
  const cam = scene.cameras.main;
  let done = false;
  const go = (): void => {
    if (done) return;
    done = true;
    for (const k of stopKeys) scene.scene.stop(k);
    scene.scene.start(key, data);
  };
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, go);
  cam.fadeOut(duration, 0, 0, 0);
  // Safety net in case the fade event never fires (e.g. tab hidden).
  scene.time.delayedCall(duration + 400, go);
}
