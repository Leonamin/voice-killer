from voice_killer.candidates import solo_spans


def test_overlap_is_cut_with_margin_and_short_pieces_dropped():
    # A 0-10, B 6-12: overlap 6-10; solo A 0-6 -> 0-5.7, solo B 10-12 -> 10.3-12 (1.7 s, too short)
    solo, over = solo_spans([(0, 10, 0), (6, 12, 1)], margin=0.3, min_len=2.0)
    assert over == [(6, 10)]
    assert [(round(s, 2), round(e, 2), k) for s, e, k in solo] == [(0, 5.7, 0)]


def test_same_speaker_adjacent_segments_join():
    solo, _ = solo_spans([(0, 3, 0), (3, 6, 0)], min_len=2.0)
    assert solo == [[0, 6, 0]]
