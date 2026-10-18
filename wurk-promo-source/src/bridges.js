// =====================================================================
//  ERAS, CAMERAS, BRIDGES — wurk-promo F4 (voiced). Hard cuts on the grid,
//  no morphs (BRIDGES = []). Two camera moves only:
//    push(t, a, b, cam)  eases from the full wide into cam        (a wide shot)
//    hold(t, a, b, A, B) sits at close framing A and drifts to B  (an insert)
//  Insert framing (hold) starts ALREADY tight, so the cut from wide to
//  close reads as a lens change, not a zoom. Windows follow the voice clock.
// =====================================================================
const hold = (t, a, b, A, B) => camMix(camOf(A), camOf(B), EZ.io(seg(t, a, b)));

function pieceCam(era, t) {
  switch (era) {
    case 0:  return push(t, 0.2, 1.9, { z: 1.04, p: [960, 500], to: [960, 540] });                                                    // open (wide)
    case 1:  return hold(t, 2.0, 4.25, { z: 1.46, p: [935, 470], to: [960, 540] }, { z: 1.60, p: [960, 486], to: [960, 540] });        // the coin (close)
    case 2:  return push(t, 4.4, 6.1, { z: 1.06, p: [1080, 620], to: [960, 540] });                                                    // desk (wide)
    case 3:  return hold(t, 6.25, 7.5, { z: 1.42, p: [1160, 700], to: [960, 540] }, { z: 1.54, p: [1205, 705], to: [960, 540] });       // the pile (close)
    case 4:  return push(t, 7.6, 9.6, { z: 1.05, p: [960, 520], to: [960, 540] });                                                     // plan (wide)
    case 5:  return hold(t, 9.75, 11.5, { z: 1.40, p: [960, 700], to: [960, 540] }, { z: 1.52, p: [960, 720], to: [960, 540] });       // the post (close)
    case 6:  return push(t, 11.6, 12.9, { z: 1.05, p: [1180, 480], to: [960, 540] });                                                  // review (wide)
    case 7:  return hold(t, 13.0, 14.5, { z: 1.40, p: [1550, 480], to: [960, 540] }, { z: 1.52, p: [1580, 480], to: [960, 540] });      // PICKED (close)
    case 8:  return push(t, 14.6, 16.4, { z: 1.06, p: [960, 470], to: [960, 540] });                                                   // agents (wide)
    case 9:  return hold(t, 16.5, 18.0, { z: 1.34, p: [960, 470], to: [960, 540] }, { z: 1.46, p: [960, 478], to: [960, 540] });        // terminal (close)
    case 10: return push(t, 18.1, 20.6, { z: 1.05, p: [960, 470], to: [960, 540] });                                                   // winner (wide)
    case 11: return hold(t, 20.75, 23.25, { z: 1.34, p: [1350, 590], to: [960, 540] }, { z: 1.46, p: [1380, 600], to: [960, 540] });    // PAID (close)
    case 12: return bump(t, 23.25, [960, 540], 0.12, 0.5);                                                                             // rush
    case 13: return push(t, 26.9, 28.3, { z: 1.04, p: [960, 580], to: [960, 540] });                                                   // silence
    case 14: return bump(t, 28.5, [960, 480], 0.22, 99);                                                                               // payoff
    case 15: return hold(t, 30.5, 32.5, { z: 1.28, p: [960, 460], to: [960, 540] }, { z: 1.38, p: [960, 462], to: [960, 540] });        // the mark (close)
    case 16: return push(t, 32.6, 36.2, { z: 1.04, p: [960, 440], to: [960, 540] });                                                   // lockup (wide)
  }
  return null;
}
const BRIDGES = [];
