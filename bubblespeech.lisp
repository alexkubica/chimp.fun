;; truetext.lisp

(defpackage :truetext
  (:use :cl :zpb-ttf)
  (:export :tt-glyph
           :font
           :xmin
           :ymin
           :xmax
           :ymax
           :bounding-box
           :string-bounding-box
           :advance-width
           :with-font
           :open-font
           :find-glyph
           :bitmap))

(in-package :truetext)

(defclass font (zpb-ttf::font-loader)
  ((pixel-size :initarg :pixel-size :accessor pixel-size)))

(defclass tt-glyph (zpb-ttf::glyph)
  ((bitmap :writer (setf bitmap))))

(defun find-pixel-size (contours)
  (let ((size most-positive-fixnum))
    (loop for contour across contours do
          (loop for point across contour
                for y = (abs (y point))
                when (and (plusp y)
                          (< y size)) do
                (setf size y)))
    size))

(defun open-font (file &key (class 'font))
  (let* ((loader (open-font-loader file))
         (glyph (make-instance 'zpb-ttf::glyph
                               :character #\Q
                               :font-index 42
                               :code-point 100
                               :font-loader loader)))
    (change-class loader class
                  :pixel-size (find-pixel-size (contours glyph)))))

(defmacro with-font ((font file
                           &optional (class ''font)
                           &rest initargs)
                     &body body)
  (let ((glyph (gensym)))
  `(with-font-loader (,font ,file)
    (let ((,glyph (make-instance 'zpb-ttf::glyph
                                 :character #\Q
                                 :font-index 42
                                 :code-point 100
                                 :font-loader ,font)))
      (setf ,font (change-class ,font ,class
                                :pixel-size (find-pixel-size (contours ,glyph))
                                ,@initargs))
      ,@body))))

(defun initialize-glyph (glyph)
  (scale-vector (bounding-box glyph) glyph)
  (loop for contour across (contours glyph)
        do (scale-vector contour glyph))
  glyph)

(defmethod find-glyph :around (character (font font))
  (let ((glyph (call-next-method)))
    (if (subtypep (class-of glyph) 'tt-glyph)
        glyph
        (initialize-glyph (change-class glyph 'tt-glyph)))))

(defgeneric scale-factor (object)
  (:method ((object number))
    object)
  (:method ((object font))
    (pixel-size object))
  (:method ((object tt-glyph))
    (pixel-size (zpb-ttf::font-loader object))))

(defgeneric scale (value object)
  (:method (value object)
    (round value (scale-factor object))))

(defmethod scale ((value zpb-ttf::control-point) object)
  (with-slots (x y)
      value
    (setf x (scale x object)
          y (scale y object))
    value))

(defgeneric scale-vector (vector object)
  (:method (vector object)
    (dotimes (i (length vector))
      (setf (aref vector i) (scale (aref vector i) object)))))



(defmethod shared-initialize :after ((font font)
                                     slot-names
                                     &key pixel-size
                                     &allow-other-keys)
  (unless pixel-size
    (error "Required initarg ~S missing" :pixel-size))
  (setf (xmin font) (scale (xmin font) font)
        (xmax font) (scale (xmax font) font)
        (ymin font) (scale (ymin font) font)
        (ymax font) (scale (ymax font) font))
  (scale-vector (zpb-ttf::left-side-bearings font) pixel-size)
  (scale-vector (zpb-ttf::advance-widths font) pixel-size))





;;; Drawing a bitmap

(defgeneric dimensions (glyph)
  (:documentation "Return the dimensions required for an array that
will contain all points in a bitmap of GLYPH.")
  (:method (glyph)
    (list (- (xmax glyph) (xmin glyph))
          (- (ymax glyph) (ymin glyph)))))

(defun contour-verticals (contour)
  "Return a vertical span for a contour, in the form of a list of X,
Y0, Y1, with Y1 < Y2."
  (when (> (length contour) 0)
    (loop with new-contour = (explicit-contour-points contour)
          for i from 1 below (length new-contour)
          for p1 = (aref new-contour 0) then p2
          for p2 = (aref new-contour i)
          for y1 = (y p1)
          for y2 = (y p2)
          for x1 = (x p1)
          for x2 = (x p2)
          when (= x1 x2)
          collect (if (< y1 y2)
                      (list x1 y1 y2)
                      (list x1 y2 y1)))))

(defun contours-verticals (contours)
  (loop for contour across contours
        nconcing (contour-verticals contour)))

(defun flag-fill (bitmap)
  (destructuring-bind (width height)
      (array-dimensions bitmap)
    (dotimes (y height bitmap)
      (let ((fillp nil))
        (dotimes (x width)
          (if (plusp (aref bitmap x y))
              (cond (fillp
                     (setf fillp nil)
                     (setf (aref bitmap x y) 0))
                    (t
                     (setf fillp t)))
              (when fillp
                (setf (aref bitmap x y) 1))))))))

(defgeneric bitmap (glyph))

(defmethod bitmap :around ((glyph tt-glyph))
  (if (slot-boundp glyph 'bitmap)
      (slot-value glyph 'bitmap)
      (setf (slot-value glyph 'bitmap) (call-next-method))))

(defmethod bitmap ((glyph tt-glyph))
  (let ((x+ (xmin glyph))
        (y+ (ymin glyph))
        (width (- (xmax glyph) (xmin glyph)))
        (bitmap (make-array (dimensions glyph) :element-type 'bit))
        (verticals (contours-verticals (contours glyph))))
    (dolist (vertical verticals (flag-fill bitmap))
      (destructuring-bind (x y0 y1)
          vertical
        (loop for y from y0 below y1
              for y* = (- y y+)
              for x* = (- x x+)
              if (< x* width) do
              (setf (aref bitmap x* y*)
                    (logxor (aref bitmap x* y*) 1)))))))

(defpackage :psb
  (:use :cl :zpb-ttf :truetext)
  (:export :psb)
  (:import-from :funweb
                :define-app
                :define-handler
                :fill-template))

;; ds.lisp

(in-package :psb)

;;; Color tables

(defconstant +black+       0)
(defconstant +white+       1)
(defconstant +background+  2)
(defconstant +shadow+      3)
(defconstant +whiteshadow+ 4)


(defun color (color-table i)
  (values (aref color-table (+ i 0))
          (aref color-table (+ i 1))
          (aref color-table (+ i 2))))

(defun set-color (color-table i r g b)
  (setf i (* i 3))
  (setf (aref color-table (+ i 0)) r
        (aref color-table (+ i 1)) g
        (aref color-table (+ i 2)) b)
  (values r g b))

(defun make-color-table (size)
  (make-array (* (expt 2 (integer-length size)) 3)
              :element-type '(unsigned-byte 8)
              :initial-element 0))


;;; Misc image-as-array manipulation

(defun height (image)
  (second (array-dimensions image)))

(defun width (image)
  (first (array-dimensions image)))

(defmacro do-region-pixels ((x y color image offset-x offset-y width height)
                            &body body)
  (let ((gimage (gensym)))
  `(loop with ,gimage = ,image
    for ,y from ,offset-y repeat ,height do
    (loop for ,x from ,offset-x repeat ,width do
     (symbol-macrolet ((,color (aref ,gimage ,x ,y)))
       ,@body)))))

(defmacro do-image-pixels ((x y color image) &body body)
  `(do-region-pixels (,x ,y ,color ,image 0 0 (width ,image) (height ,image))
    ,@body))

(defun fill2d (image color x y width height)
  (do-region-pixels (px py pcolor image x y width height)
    (setf pcolor color)))

(defun triple (image)
  "Return an image tripled."
  (destructuring-bind (width height)
      (array-dimensions image)
    (let* ((new-width (* width 3))
           (new-height (* height 3))
           (new-image (make-array (list new-width new-height))))
      (do-image-pixels (x y color image)
        (dotimes (j 3)
          (dotimes (k 3)
            (setf (aref new-image (+ (* x 3) k) (+ (* y 3) j)) color))))
      new-image)))

(defun double (image)
  "Return an image doubled."
  (destructuring-bind (width height)
      (array-dimensions image)
    (let* ((new-width (* width 2))
           (new-height (* height 2))
           (new-image (make-array (list new-width new-height))))
      (do-image-pixels (x y color image)
        (dotimes (j 2)
          (dotimes (k 2)
            (setf (aref new-image (+ (* x 2) k) (+ (* y 2) j)) color))))
      new-image)))

(defun invert (image)
  (dotimes (i (array-total-size image) image)
    (setf (row-major-aref image i) (logxor 1 (row-major-aref image i)))))

(defun flip-vertical (image)
  (loop for x below (width image) do
        (loop for i from 0
              for j downfrom (1- (height image))
              while (< i j) do (rotatef (aref image x i)
                                        (aref image x j))))
  image)

(defun rotate (image)
  (let ((new-image (make-array (array-dimensions image))))
    (do ((i 0 (1+ i))
         (j (1- (array-total-size image)) (1- j))
         (end (array-total-size image)))
        ((= i end) new-image)
      (setf (row-major-aref new-image j)
            (row-major-aref image i)))))

(defun flip-horizontal (image)
  (rotate (flip-vertical image)))


(defun paste-bitmap (source target x y)
  (destructuring-bind (width height)
      (array-dimensions source)
    (loop for ys from 0
          for yt from y
          repeat height do
          (loop for xs from 0
                for xt from x
                repeat width do
                (finish-output)
                (setf (aref target xt yt)
                      (logior (aref target xt yt)
                              (aref source xs ys)))))
    target))

(defun paste (source target offset-x offset-y)
  (do-image-pixels (x y color source)
    (unless (equal color 255)
      (setf (aref target (+ x offset-x) (+ y offset-y)) color))))


;;; Strings and glyphs

(defclass ds-glyph (tt-glyph)
  ((frobbedp
    :initform nil
    :accessor frobbedp)
   (clchar
    :reader clchar
    :initarg :clchar)))

(defclass ds-font (font) ())

(defmethod print-object ((glyph ds-glyph) stream)
  (print-unreadable-object (glyph stream :type t :identity t)
    (format stream "~S" (zpb-ttf:postscript-name glyph))))

(defmethod find-glyph :around (character (font ds-font))
  (let ((glyph (call-next-method)))
    (change-class glyph 'ds-glyph :clchar character)))

(defparameter *narrow-glyphs* (list #\. #\: #\,))

(defun narrowp (character)
  (member character *narrow-glyphs*))

(defmethod shared-initialize :after ((glyph ds-glyph)
                                     slot-names
                                     &key
                                     &allow-other-keys)
  (when (narrowp (clchar glyph))
    (unless (frobbedp glyph)
      (setf (frobbedp glyph) t)
      (loop for contour across (contours glyph) do
            (loop for control-point across contour do
                  (incf (x control-point))))
      (incf (xmin glyph))
      (incf (xmax glyph)))))

(defmethod advance-width ((glyph ds-glyph))
  (if (narrowp (clchar glyph))
      (call-next-method)
      (1- (call-next-method))))

(defmethod left-side-bearing ((glyph ds-glyph))
  (if (narrowp (clchar glyph))
      (1+ (call-next-method))
      (call-next-method)))

(defclass ds-string ()
  ((font
    :initarg :font
    :accessor font)
   (xmin
    :initarg :xmin
    :writer (setf xmin))
   (ymin
    :initarg :ymin
    :writer (setf ymin))
   (xmax
    :initarg :xmax
    :writer (setf xmax))
   (ymax
    :initarg :ymax
    :writer (setf ymax))
   (bitmap
    :initarg :bitmap
    :writer (setf bitmap))
   (contents
    :initarg :contents
    :accessor contents)))

(defmethod print-object ((object ds-string) stream)
  (print-unreadable-object (object stream :type t)
    (format stream "~S" (contents object))))

(defmethod initialize-instance :after ((ds-string ds-string)
                                       &key contents font
                                       &allow-other-keys)
  (unless contents
    (error "Required initarg ~S not supplied" :contents))
  (unless font
    (error "Required initarg ~S not supplied" :font)))

(defgeneric initialize-ds-string (string))

(defmethod initialize-ds-string (ds-string)
  (let* ((font (font ds-string))
         (string (contents ds-string))
         (bbox (string-bounding-box string font))
         (xmin (xmin bbox))
         (ymin (ymin bbox))
         (xmax (xmax bbox))
         (ymax (ymax bbox)))
    (setf (xmin ds-string) (* xmin 2)
          (ymin ds-string) (* ymin 2)
          (xmax ds-string) (* xmax 2)
          (ymax ds-string) (* ymax 2))
    (let ((bitmap (make-array (list (- xmax xmin) (- ymax ymin))
                              :element-type '(unsigned-byte 8)
                              :initial-element 0))
          (x 0))
      (dotimes (i (length string))
        (let ((glyph (find-glyph (char string i) font)))
          (paste-bitmap (bitmap glyph)
                        bitmap
                        (- (+ x (left-side-bearing glyph)) xmin)
                        (- (ymin glyph) ymin))
          (incf x (advance-width glyph))))
      (setf (bitmap ds-string) (double (invert (flip-vertical bitmap)))))))

(macrolet ((lazy-accessor (name)
             `(defmethod ,name ((ds-string ds-string))
               (when (or (slot-boundp ds-string ',name)
                         (initialize-ds-string ds-string))
                 (slot-value ds-string ',name)))))
  (lazy-accessor xmin)
  (lazy-accessor ymin)
  (lazy-accessor xmax)
  (lazy-accessor ymax)
  (lazy-accessor bitmap))



;;; Drawing the background bubble

(defparameter *spike*
  #2A((0 0 0 2 2 2 2)
      (1 1 1 0 2 2 2)
      (1 1 1 1 0 2 2)
      (1 1 1 1 1 0 2)
      (0 0 0 1 1 0 3)
      (0 3 3 0 0 0 3)
      (0 3 2 3 3 3 0)))

(defparameter *thought*
  #2A((255 0 0 0 255 255 255 255 255 255)
      (0 1 1 1 0 255 255 255 255 255)
      (0 1 1 4 0 3 255 255 255 255)
      (0 1 1 4 0 3 255 255 255 255)
      (0 4 4 4 0 3 255 255 255 255)
      (255 0 0 0 3 3 255 255 255 255)
      (255 255 3 3 3 255 0 0 255 255)
      (255 255 255 255 255 0 1 4 0 255)
      (255 255 255 255 255 0 4 4 0 3)
      (255 255 255 255 255 255 0 0 3 3)))

(defparameter *corner-nw*
  #2A((2 2)
      (2 0)))

(defparameter *corner-sw*
  #2A((2 2)
      (0 2)))

(defparameter *corner-se*
  #2A((0 3 3)
      (3 3 2)
      (3 2 2)))

(defparameter *corner-ne*
  #2A((2 0)
      (2 2)))

(defun make-bubble (width height &key (spike t))
  "Return a speech bubble. The HEIGHT and WIDTH refer to the interior
pixel space; the dimensions of the returned array will include space
for the \"speech spike\", borders, and shadows. The upper-left corner
of the interior space starts at <2,2>. HEIGHT and WIDTH must both be
must be at least 10."
  (setf width (max width *minimum-bubble-width*))
  (setf height (max height *minimum-bubble-height*))
  (setf width (ceiling width 3)
        height (ceiling height 3))
  (when (< (min height width) 10)
    (error "HEIGHT and WIDTH must both be at least 30"))
  (let* ((real-width (+ width 7))
         (spike-padding (+ 3 (if spike
                                 (array-dimension *spike* 0)
                                 0)))
         (real-height (+ height spike-padding))
         (bubble (make-array (list real-width real-height)
                             :initial-element +background+)))
    (fill2d bubble +shadow+ 4 4 (+ 2 width) (1- height))
    (fill2d bubble +black+ 1 1 (+ 4 width) (1+ height))
    (fill2d bubble +white+ 2 2 (+ 2 width) (1- height))
    (paste *corner-nw* bubble 1 1)
    (paste *corner-sw* bubble 1 height)
    (paste *corner-se* bubble (+ 3 width) height)
    (paste *corner-ne* bubble (+ 3 width) 1)
    (when spike
      (let ((offset (if (eql *spike* *thought*) -1 0)))
        (paste *spike* bubble (truncate width 3/2) (+ offset (+ height 1)))))
    (triple bubble)))

(defparameter *font-file*
  (merge-pathnames #p"slkscr.ttf"
                   #.(or *load-truename*
                         *compile-file-truename*)))

(defun list-designator-list (designator)
  (if (consp designator)
      designator
      (list designator)))

(defparameter *text-y-offset* 24
  "The offset from the top of the image where text is first drawn.")

(defparameter *text-x-offset* 13
  "The offset from the left of the image where the leftmost point of
the widest line of text is first drawn.")

(defparameter *left-padding* 13)

(defparameter *line-advance* 16
  "The number of pixels to move down when placing another line of text.")

(defparameter *minimum-bubble-height* 30)
(defparameter *minimum-bubble-width* 30)

(defparameter *bubble-height-padding* 18)
(defparameter *bubble-width-padding* 8)

(defgeneric strings-bounding-box (ds-strings))
(defmethod strings-bounding-box (ds-strings)
  (let ((xmin most-positive-fixnum) (ymin most-positive-fixnum)
        (xmax most-negative-fixnum) (ymax most-negative-fixnum)
        (y 0))
    (dolist (string ds-strings (values xmin ymin xmax ymax))
      (setf xmin (min xmin (xmin string))
            ymin (min ymin (+ y (ymin string)))
            xmax (max xmax (xmax string))
            ymax (max ymax (+ y (ymax string))))
      (incf y *line-advance*))))

#|

A button looks like

 ...........
 .########..
 .# Text #%.
 .########%.
 ..%%%%%%%%.
 ...........

I guess it doesn't need padding.
|#

(defun text-button (string)
  (with-font (font *font-file* 'ds-font)
    (let ((string (make-instance 'ds-string :contents string :font font)))
      (multiple-value-bind (xmin ymin xmax ymax)
          (strings-bounding-box (list string))
        (let* ((height (- ymax ymin))
               (width (- xmax xmin))
               (padding 8)
               (button-width  (+ width  padding 3 3 3))
               (button-height (+ height padding 3 3 3))
               (box-width     (+ width  padding 3 3))
               (box-height    (+ height padding 3 3))
               (inner-width   (+ width padding))
               (inner-height  (+ height padding))
               (button (make-array (list button-width button-height)
                                   :initial-element +background+)))
          (fill2d button +shadow+ 3 3 box-width box-height)
          (fill2d button +black+ 0 0 box-width box-height)
          (fill2d button +white+ 3 3 inner-width inner-height)
          (paste (bitmap string) button 7 7)
          button)))))

(defun text-bubble (strings &key flip (spike t))
  (with-font (font *font-file* 'ds-font)
    (flet ((ds-string (string)
             (make-instance 'ds-string
                            :contents string
                            :font font)))
      (let ((strings (mapcar #'ds-string (list-designator-list strings)))
            (y *text-y-offset*))
        (multiple-value-bind (xmin ymin xmax ymax)
            (strings-bounding-box strings)
          (let* ((height (- ymax ymin))
                 (width (- xmax xmin))
                 (bubble (make-bubble (max (+ width *bubble-width-padding*)
                                           *minimum-bubble-width*)
                                      (max (+ height *bubble-height-padding*)
                                           *minimum-bubble-height*)
                                      :spike spike)))
            (when flip
              (setf bubble (flip-horizontal bubble)))
            (dolist (string strings (triple bubble))
              ;; Center lines
              (paste (bitmap string) bubble
                     (+ *text-x-offset*
                        (if flip 3 0)
                        (truncate (- width (- (xmax string)
                                              (xmin string)))
                                  2))
                     (- y (ymax string)))
              (incf y *line-advance*))))))))


;;; Creating the GIF


(defun bubble->image-data (bubble)
  (let ((array (make-array (array-total-size bubble)
                           :element-type '(unsigned-byte 8)))
        (i 0))
    (do-image-pixels (x y color bubble)
      (setf (aref array i) color)
      (incf i))
    array))

(defun bubble->png-data (bubble)
  (let ((array (make-array (* (height bubble) (width bubble) 4)
                           :initial-element 255
                           :element-type '(unsigned-byte 8)))
        (i 0))
    (do-image-pixels (x y color bubble)
      (case color
        (#.+background+
         (incf i 3)
         (setf (aref array i) 0)
         (incf i))
        (#.+white+
         (incf i 4))
        (#.+black+
         (fill array 0 :start i :end (+ i 3))
         (incf i 4))
        (#.+shadow+
         (fill array 0 :start i :end (+ i 3))
         (incf i 3)
         (setf (aref array i) 51)
         (incf i))
        (#.+whiteshadow+
         (fill array 204 :start i :end (+ i 3))
         (incf i 4))))
    array))

(defun bubble-png (bubble file)
  (let ((png (make-instance 'zpng:png
                            :height (height bubble)
                            :width (width bubble)
                            :color-type :truecolor-alpha
                            :image-data (bubble->png-data bubble))))
    (zpng:write-png png file)
    (values (probe-file file)
            (width bubble)
            (height bubble))))

(defun psb (strings output-file &key flip (spike t) thought)
  (let ((*spike* (if thought *thought* *spike*)))
    (unless (listp strings)
      (setf strings (mapcar (lambda (string)
                              (string-trim '(#\Space) string))
                            (ppcre:split "[\\r\\n]+" strings))))
    (let ((bubble (text-bubble strings :flip flip :spike spike)))
      (bubble-png bubble output-file))))
;;;; animated.lisp

(in-package #:psb)

(defmethod advance-width ((string ds-string))
  (loop with font = (font string)
        for char across (contents string)
        summing (advance-width (find-glyph char font))))

(defun split-into-words (line)
  (map 'list 'string line ))

(defun split-into-ds-words (line font)
  (flet ((ds-word (string)
           (make-instance 'ds-string
                          :font font
                          :contents string)))
    (let* ((words (mapcar #'ds-word (split-into-words line)))
           (offsets (cons 0 (mapcar #'advance-width words))))
      (loop for word in words
            for i in offsets
            summing i into offset
            collect (cons word offset)))))


(defun rgb->hsv (r g b)
  (let* ((min (min r g b))
         (max (max r g b))
         (delta (- max min))
         h s v)
    (block nil
      (when (zerop delta)
        (return (values -1 0 (/ max 255))))
      (setf v max
            s (/ delta max))
      (cond ((= r max)
             (setf h (+ 0 (/ (- g b) delta))))
            ((= g max)
             (setf h (+ 2 (/ (- b r) delta))))
            (t
             (setf h (+ 4 (/ (- r g) delta)))))
      (setf h (* h 60))
      (when (< h 0)
        (incf h 360))
      (values h s (/ v 255)))))

(defun hsv->rgb (h s v)
  (block nil
    (when (zerop s)
      (values v v v))
    (setf h (/ h 60))
    (let* ((i (floor h))
           (f (- h i))
           (p (* v (- 1 s)))
           (q (* v (- 1 (* s f))))
           (tee (* v (- 1 (* s (- 1 f))))))
      (case i
        (0 (values v tee p))
        (1 (values q v p))
        (2 (values p v tee))
        (3 (values p q v))
        (4 (values tee p v))
        (otherwise (values v p q))))))

(defun shadow-color (r g b)
  (multiple-value-bind (h s v)
      (rgb->hsv r g b)
    (multiple-value-bind (r* g* b*)
        (hsv->rgb h s (max (- v 0.2) 0))
      (values (truncate (* r* 255))
              (truncate (* g* 255))
              (truncate (* b* 255))))))

(defun bubble-bitmap (strings font &key (spike t))
  (flet ((ds-string (string)
           (make-instance 'ds-string
                          :contents string
                          :font font)))
    (multiple-value-bind (xmin ymin xmax ymax)
        (strings-bounding-box (mapcar #'ds-string
                                      (list-designator-list strings)))
      (let ((height (- ymax ymin))
            (width (- xmax xmin)))
        (make-bubble (+ width *bubble-width-padding*)
                     (+ height *bubble-height-padding*)
                     :spike spike)))))

(defun initialize-gif-colors (gif)
  (let ((table (skippy:color-table gif)))
    (skippy:add-color 0 table)
    (skippy:add-color 0 table)
    (skippy:add-color 0 table)
    (skippy:add-color 0 table)
    (skippy:add-color 0 table)
    (setf (skippy:color-table-entry table +white+)
          (skippy:rgb-color #xFF #xFF #xFF))
    (setf (skippy:color-table-entry table +background+)
          (skippy:rgb-color #xFF #xFF #xFF))
    (setf (skippy:color-table-entry table +black+)
          (skippy:rgb-color #x00 #x00 #x00))
    (setf (skippy:color-table-entry table +shadow+)
          (skippy:rgb-color 204 204 204))
    (setf (skippy:color-table-entry table +whiteshadow+)
          (skippy:rgb-color 204 204 204))))

(defun dummy-image (x y)
  (skippy:make-image :height 1 :width 1
                     :top-position y
                     :left-position x
                     :image-data (make-array 1
                                             :element-type '(unsigned-byte 8)
                                             :initial-element +background+)))

(defun animated-speech-bubble (strings output-file &key flip (spike t) thought)
  (with-font (font *font-file* 'ds-font)
    (labels ((ds-string (string)
               (make-instance 'ds-string
                              :contents string
                              :font font))
             (h (ds)
               (max 1 (- (ymax ds) (ymin ds))))
             (w (ds)
               (max 1 (- (xmax ds) (xmin ds))))
             (string-image (string x y)
               (if (or (equal string " ")
                       (equal string ""))
                   (dummy-image (* x 3) (* y 3))
                   (let ((ds (ds-string string)))
                     (skippy:make-image :height (* (h ds) 3)
                                        :width (* (w ds) 3)
                                        :top-position (* y 3)
                                        :left-position (* x 3)
                                        :image-data  (bubble->image-data
                                                      (triple (bitmap ds))))))))
      (let* ((*spike* (if thought *thought* *spike*))
             (bubble (bubble-bitmap strings font :spike spike)))
        (setf bubble (triple bubble))
        (when flip
          (setf bubble (flip-horizontal bubble)))
        (let* ((height (height bubble))
               (width (width bubble))
               (bubble-image (skippy:make-image :height height
                                                :width width
                                                :transparency-index +background+
                                                :image-data (bubble->image-data bubble)))
               (gif (skippy:make-data-stream :height height
                                             :width width
                                             :loopingp t
                                             :color-table t
                                             :initial-images (list bubble-image)))
               (y *text-y-offset*))
          (flet ((add-line (line)
                   (let* ((image (string-image line 0 y))
                          (width (skippy:width image))
                          (words (split-into-ds-words line font)))
                     (setf (skippy:left-position image)
                           (+ 3
                              (if flip 0 -9)
                              (truncate (- (width bubble)
                                           width)
                                        2)))
                     (let ((base (/ (skippy:left-position image) 3)))
                       (loop for (word . advance) in words
                             for image = (string-image (contents word)
                                                       (+ base (truncate (* advance 2)))
                                                       (- y (ymax word)))
                             do
                             (setf (skippy:delay-time image) (+ 5 (random 15)))
                             when (plusp (skippy:width image))
                             do
                             (skippy:add-image image gif)))
                     (incf y *line-advance*))))
            (initialize-gif-colors gif)
            (dolist (line (list-designator-list strings))
              (add-line line))
            (skippy:add-delay 400 gif)
            (skippy:output-data-stream gif output-file)))))))