type SourceLink = {
  label: string;
  href: string;
  note?: string;
};

export const creditByExamAuthor = "Nidhish Kakkireni";

export const creditByExamSources: SourceLink[] = [
  {
    label: "Notebook LM",
    href: "https://notebooklm.google/",
    note: "Paste the UT study guides into this AI tool to generate more practice problems similar to the sample questions given. Requires a paid subscription only if you use a very high amount of resources — not needed otherwise. Also great for making flashcards, podcasts, and videos from the same material.",
  },
  {
    label: "STAAR released tests",
    href: "https://tea.texas.gov/data-reports/staar/staar-released-test-questions",
  },
  {
    label: "Khan Academy",
    href: "https://www.khanacademy.org/",
  },
  {
    label: "All CBE course offerings (PDF)",
    href: "https://resources.finalsite.net/images/v1745887403/katyisdorg/q6nnngd3nhe0pg47lozc/courses_offered.pdf",
    note: "Some may not apply to your school — check with your counselor before applying for a CBE.",
  },
  {
    label: "Katy ISD — Credit by Examination (source)",
    href: "https://www.katyisd.org/research-assessment-and-accountability/national-and-local-assessment/credit-by-examination-cbe",
    note: "All study guides are posted here.",
  },
];

function Callout({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-marker/50 bg-marker/10 rounded-lg p-5">
      <p className="font-mono text-xs uppercase tracking-wide text-ink mb-2">{label}</p>
      <div className="text-ink text-sm sm:text-base leading-relaxed">{children}</div>
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight mb-5">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display font-bold text-xl text-ink tracking-tight mb-3 mt-8">
      {children}
    </h3>
  );
}

const ul = "space-y-2.5 text-ink-soft text-base leading-relaxed list-disc pl-5 marker:text-pen";
const nestedUl = "space-y-2 text-ink-soft text-base leading-relaxed list-[circle] pl-5 mt-2 marker:text-pen";

export function CreditByExamGuide() {
  return (
    <article className="space-y-14">
      <section>
        <H2>Personal experience</H2>
        <div className="space-y-4 text-ink-soft text-base sm:text-lg leading-relaxed">
          <p>
            Hello everyone, my name is Nidhish Kakkireni! My experience with the CBE can be
            described in one word: unexpected. It all started when my KAP 6th-grade math
            teacher saw me excel in the subject and learn concepts incredibly fast. This led
            my teacher to suggest me to take the Credit By Exam to skip 7th and 8th grade
            math and move to Algebra 1 in my 7th grade year. Now, this was my mindset during
            that time. I had just moved to the US from my home country and was unfamiliar
            with the Katy ISD and US education systems. Hence, because it was a teacher
            recommendation, I attempted the 8th-grade Math CBE (you'll see why in a second),
            and I PASSED. Now, it wasn't a piece of cake because I knew nothing about the CBE
            and had nobody to assist me with it.
          </p>
          <p>
            I will take you guys on a deep dive into CBE, so you know every single,
            micro-specific detail about this examination.
          </p>
        </div>
      </section>

      <section>
        <H2>Lessons from my experience</H2>
        <ul className={ul}>
          <li>
            Skipping the 8th grade CBE contained far more rigour compared to the 6th grade
            CBE that most of my future friends took.
          </li>
          <li>
            This is because you are technically skipping 2 grade levels instead of one.
            Hence, it is highly recommended to take the 6th-grade CBE instead.
          </li>
          <li>
            Adding on to the previous point, taking the 6th-grade CBE might be a greater
            challenge than the 8th-grade one. This is because there is typically a big jump
            in rigour compared to middle school and elementary math. That is also why many
            people who pass the CBE score extremely high if they skip the 8th grade compared
            to the 6th grade.
          </li>
          <li>
            Hence, it is your pick. If you are very adaptive to different forms of material,{" "}
            <strong className="text-ink font-semibold">GO WITH THE 6TH GRADE CBE.</strong> If
            you aren't so adaptive and are a very fast learner, go with the 8th-grade one.
          </li>
          <li>
            <strong className="text-ink font-semibold">Impact on future grades:</strong> Every
            middle school math course contains some extremely fundamental concepts that are
            crucial for future maths. Hence, you also need to consider if you will be able to
            carry on the concepts that you have self-learned to the next level without
            teacher assistance (but that shouldn't be the main reason to stop you from taking
            the CBE, because most of my future teachers were very flexible in explaining
            material).
          </li>
        </ul>
      </section>

      <section>
        <H2>Commonly confused terms</H2>
        <ul className={ul}>
          <li>
            <strong className="text-ink font-semibold">Course:</strong> This is a specific
            class (Algebra 2, Tennis, Health Science). This term is typically used in High
            school, as there are many courses available in each subject.
          </li>
          <li>
            <strong className="text-ink font-semibold">Subject:</strong> This is a branch of
            knowledge that contains common characteristics of learning, understanding, and
            practicing (Math, science, sports).
          </li>
          <li>
            <strong className="text-ink font-semibold">Endorsement:</strong> Keep in mind that
            this is not an endorsement. An endorsement is a specific pathway in college or
            high school that requires completing certain courses.
          </li>
        </ul>
        <p className="text-ink-soft text-base leading-relaxed mt-4">
          For example, Algebra 2 would be a course within the subject of math. This course
          can be part of the Math endorsement taken within high school.
        </p>
      </section>

      <section>
        <H2>What is the CBE?</H2>
        <p className="text-ink-soft text-base sm:text-lg leading-relaxed mb-6">
          The Credit by Examination is a test that one can take to skip a Course, subject, or
          an entire grade level. This examination is typically taken to accelerate in
          subjects by earning more high school credits in advance, and providing a GPA boost
          (example below). As per my experience, the most common CBE that people take in
          junior high is for math (more on this later).
        </p>

        <p className="course-code text-xs text-ink-soft uppercase mb-3">
          Scenario: person currently in the end of 5th grade
        </p>
        <div className="overflow-x-auto border border-rule rounded-lg">
          <table className="w-full text-sm sm:text-base border-collapse">
            <thead>
              <tr className="bg-paper-dim">
                <th className="text-left font-display font-bold text-ink p-4 border-b border-rule w-1/2">
                  With CBE — taking the 6th-grade CBE
                </th>
                <th className="text-left font-display font-bold text-ink p-4 border-b border-rule w-1/2">
                  Without CBE
                </th>
              </tr>
            </thead>
            <tbody className="text-ink-soft">
              <tr>
                <td className="p-4 border-b border-rule align-top">
                  <strong className="text-ink font-semibold">6th grade course:</strong> 8th
                  Math KAP
                </td>
                <td className="p-4 border-b border-rule align-top">
                  <strong className="text-ink font-semibold">6th grade course:</strong> 6th
                  Math KAP (includes ½ of 7th grade math)
                </td>
              </tr>
              <tr>
                <td className="p-4 border-b border-rule align-top">
                  <strong className="text-ink font-semibold">7th grade course:</strong>{" "}
                  Algebra 1 (no KAP course available for Algebra 1)
                </td>
                <td className="p-4 border-b border-rule align-top">
                  <strong className="text-ink font-semibold">7th grade course:</strong> 8th
                  grade KAP
                </td>
              </tr>
              <tr>
                <td className="p-4 align-top">
                  <strong className="text-ink font-semibold">8th grade course:</strong>{" "}
                  Geometry KAP
                </td>
                <td className="p-4 align-top">
                  <strong className="text-ink font-semibold">8th grade course:</strong>{" "}
                  Algebra 1
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-ink-soft text-base leading-relaxed mt-6">
          According to the scenario, if a person takes the CBE, they will be ahead of a
          person without the CBE, as they will obtain 2 high school credits for math in
          Junior High instead of 1. This, in the future, will enable a person taking the CBE
          to have a greater GPA and more open spots for their courses in high school.
        </p>
      </section>

      <section>
        <H2>Things to know before we divide into sections</H2>
        <ul className={ul}>
          <li>To successfully skip the item, you must receive an 80% or higher (more on this later).</li>
          <li>There is a $75 fee for each test.</li>
          <li>
            <strong className="text-ink font-semibold">
              If you are taking the CBE of a high school course, you are only taking the
              4.0/ACA version of that course.
            </strong>
          </li>
          <li>For Katy ISD, these exams are conducted by the universities UT, Texas Tech, or Avant.</li>
          <li>
            Katy ISD offers 4 time slots to take your exam — doesn't apply to elementary
            schoolers (based on the 2025–26 calendar, dates are typically in this range):
            <ul className={nestedUl}>
              <li>November (end)</li>
              <li>Feburary (mid)</li>
              <li>June</li>
              <li>July</li>
            </ul>
          </li>
          <li>
            One person is limited to skipping only one grade level, or one course per subject
            per year.
            <ul className={nestedUl}>
              <li>
                <em>For example</em>, if person A is in kindergarten, they are thinking of
                skipping 1st grade by taking the CBE over the February time slot. After he
                took the test, person A passed the exam. Person A also wants to skip 2nd
                grade within the July slot. Person A cannot do this, as each person can only
                skip a maximum of 1 grade level per year.
              </li>
              <li>
                <em>Another example.</em> Person B is currently an 8th grader. He took the
                Algebra 1 CBE in February and passed. Now, person B cannot skip another math
                course in the same year. However, he is allowed to skip a course in another
                subject (ex, Spanish).
              </li>
            </ul>
          </li>
          <li>
            <strong className="text-ink font-semibold">The retake rule:</strong> If one
            received a score of 80 or lower on any exam, they are allowed to take one retest
            for that course.
            <ul className={nestedUl}>
              <li>
                <strong className="text-ink font-semibold">There are some exceptions:</strong>
              </li>
              <li>
                If one takes their CBE examination in June, a retest is only accepted if they
                get a 78 or a 79. Hence, if you score anything lower, you will not be able to
                retake the CBE for that course in the same year.
              </li>
              <li>
                If one takes their CBE in July, you are simply not allowed to retake the test
                at all because there are no available slots for taking a test afterwards.
              </li>
            </ul>
          </li>
        </ul>
      </section>

      <section>
        <H2>Skipping a grade level</H2>
        <p className="text-ink-soft text-base leading-relaxed italic mb-4">
          This is only applied to elementary school graders only (K–5)
        </p>
        <ul className={ul}>
          <li>
            You must score an 80% or higher on the Math, Science, Language Arts, and Social
            Studies to skip the grade level.
          </li>
          <li>There is only one window to test (time period).</li>
          <li>No retest.</li>
          <li>
            For Kindergarten, First Grade, and Second Grade assessments — test question
            transcription by a proctor is allowed.
          </li>
        </ul>
      </section>

      <section>
        <H2>Skipping a course — junior high level — KAP math</H2>

        <p className="course-code text-xs text-ink-soft uppercase mb-3">Math steps</p>
        <ol className="space-y-1.5 text-ink-soft text-base leading-relaxed list-decimal pl-5 marker:text-pen mb-8">
          <li>6th-grade Math</li>
          <li>Seventh-grade Math</li>
          <li>8th-grade Math</li>
          <li>Algebra 1</li>
          <li>Geometry</li>
          <li>Algebra 2</li>
        </ol>

        <H3>Before jumping right in, you need to understand how KAP Math works</H3>
        <ul className={ul}>
          <li>
            <strong className="text-ink font-semibold">6th-grade KAP</strong> — A student in
            this class learns all of 6th-grade math and half of 7th-grade math, which is
            added to their syllabus.
          </li>
          <li>
            <strong className="text-ink font-semibold">7th-grade KAP</strong> — The second
            half of 7th grade math left off from 6th grade, and complete 8th grade math.
          </li>
          <li>
            <strong className="text-ink font-semibold">8th grade KAP</strong> — High school
            course — Algebra I.
          </li>
        </ul>

        <H3>How CBE applies to this arrangement</H3>

        <p className="font-display font-bold text-lg text-ink mt-2 mb-2">
          Scenario 1: Taking the 6th-grade Math CBE in 5th grade (or in the summer after 5th
          grade ends)
        </p>
        <p className="text-ink-soft text-base leading-relaxed mb-3">
          If taking the 6th-grade math CBE (in 5th grade): you will be questioned on the
          6th-grade ACA level of math.
        </p>
        <p className="text-ink-soft text-base leading-relaxed mb-2">
          <strong className="text-ink font-semibold">Keep in mind:</strong> once you enter
          6th grade you have two options:
        </p>
        <ul className={ul}>
          <li>
            Taking the 7th-grade Math KAP class (recommended)
            <ul className={nestedUl}>
              <li>
                If so, you need to keep in mind that half of seventh-grade math is already
                taught in the previous year (6th-grade math, which you just skipped).
              </li>
              <li>You will be learning 8th-grade math along with the second half of 7th-grade math.</li>
              <li>You will take the 8th-grade math STAAR test.</li>
              <li>
                When you are an 8th grader, you will be taking Geometry I KAP (if you
                passed). There is no STAAR for Geometry 1 KAP.
              </li>
              <li>So, you will be taking the 8th-grade math STAAR again — nothing to worry about, but just a mention.</li>
            </ul>
          </li>
          <li>
            Taking the 7th grade Math ACA class (not recommended):
            <ul className={nestedUl}>
              <li>You will simply take the 7th-grade math ACA curriculum.</li>
              <li>You will take the 7th-grade math STAAR test.</li>
            </ul>
          </li>
        </ul>

        <p className="font-display font-bold text-lg text-ink mt-8 mb-2">
          Scenario 2: Taking the CBE in 6th grade (or summer after) and you did 6th grade KAP
          math
        </p>
        <ul className={ul}>
          <li>
            If you want to continue the KAP math, you will take the 8th-grade math CBE. Why?
            Because half of 7th-grade math and full 8th-grade math will be taught the year
            after. So, you must skip the 8th-grade math portion. So the next year, when you
            are in 7th grade, you will be taking Algebra 1.
          </li>
          <li>
            <strong className="text-ink font-semibold">
              You want to skip 7th grade math — not at all recommended.
            </strong>
            <ul className={nestedUl}>
              <li>
                Why? You will be forcing yourself to take Academic 8th-grade Math in 7th
                grade, with no difference in just doing regular KAP math.
              </li>
              <li>
                Hence, even if you do the 7th-grade Math CBE or do KAP Math throughout middle
                school is the same.
              </li>
            </ul>
          </li>
        </ul>

        <p className="font-display font-bold text-lg text-ink mt-8 mb-2">
          Scenario 3: You are in 6th-grade ACA and trying to take the CBE
        </p>
        <ul className={ul}>
          <li>
            Taking the 7th grade Math CBE — not recommended. This option might not be
            allowed — you should check with your counselor.
          </li>
          <li>Taking the summer course for converting to KAP math — recommended.</li>
        </ul>

        <p className="font-display font-bold text-lg text-ink mt-8 mb-3">
          Scenario 4: You are in 7th grade and trying to take the Algebra 1 CBE
        </p>
        <Callout label="Caution">
          This exam will be divided into two parts; you must get a 80% or higher on both
          parts to pass the CBE. If you get lower than a 90%, you will not have a 4.0 GPA for
          this class — it will be a 3.0.
        </Callout>

        <p className="font-display font-bold text-lg text-ink mt-8 mb-2">
          Scenario 5: You are in 8th grade, going into 9th grade, and trying to take the
          Geometry CBE
        </p>
        <p className="text-ink-soft text-base leading-relaxed">
          <em>Assumption:</em> you are in KAP Math and want to continue this path — this is
          highly not recommended because when a person skips a high school credit course,
          such as geometry in this case, they are skipping the academic version of the
          course. Hence, instead of receiving a maximum of 5.0 weighted GPA for geometry, you
          would only receive a maximum of 4.0 weighted GPA points. Although this seems very
          little, it might decrease your rank significantly (depending on the
          competitiveness of your school).
        </p>
      </section>

      <section>
        <H2>CBE for high school</H2>

        <H3>Math</H3>
        <p className="text-ink-soft text-base leading-relaxed">
          If you are willing to continue the KAP path,{" "}
          <strong className="text-ink font-semibold">
            it is not recommended to do any CBE other than Algebra 1.
          </strong>{" "}
          Why? Because excluding Algebra 1, every other Math High school class that you can
          take the CBE in is a KAP or an AP class. Hence, they are 5.0s instead of Algebra
          1's 4.0 (there is no KAP Algebra 1). When you are taking any CBE for a high school
          class, you are always taking the ACA version. Hence, if you take, for instance, the
          Geometry CBE, you will be skipping the ACA version, so if you pass, the maximum GPA
          you can get is a 4.0, in contrast to the in-school KAP geometry course, which maxes
          out at a 5.0.
        </p>

        <H3>Foreign languages</H3>
        <p className="text-ink-soft text-base leading-relaxed mb-4">
          As for my experience, this is another common CBE that many people take after Math.
          It is very good if you want to get a head start with credits, and it enables you to
          obtain all of your mandatory language courses for High school.
        </p>
        <p className="text-ink-soft text-base leading-relaxed mb-2">
          <strong className="text-ink font-semibold">How it works/what is different:</strong>{" "}
          if you want to skip two years of language at once:
        </p>
        <ul className={ul}>
          <li>You must take the level 1 and level 2 examinations first (yes, I know it is a lot).</li>
          <li>
            This is very recommended if you already speak, write, and/or read the language
            that corresponds to the CBE you are about to take.
          </li>
          <li>
            If you don't speak, write, and/or read the language you want to take the CBE, you
            might have to prepare more, as you will be exposed to a language that you aren't
            fluent in. However, as per my experience, there have still been some people who
            have taken the CBE for a language that they aren't fluent in.
          </li>
        </ul>

        <p className="font-display font-bold text-lg text-ink mt-6 mb-2">Scenario #1</p>
        <p className="text-ink-soft text-base leading-relaxed">
          One can also skip level 3 of the given foreign language. However, this is not
          recommended because again, you are going to be skipping the academic level of the
          course. Hence, you will miss out on the KAP level course that is offered at your
          Katy ISD school. This is because all level 3 languages are KAP level courses,
          meaning that they are weighted on a 5.0 scale instead of a 4.0 scale (which
          corresponds to the CBE).
        </p>
        <p className="text-ink-soft text-base leading-relaxed italic mt-4">
          We will be focusing more on specific courses because there are fewer elementary
          schoolers.
        </p>

        <H3>Other subjects</H3>
        <p className="text-ink-soft text-base leading-relaxed mb-4">
          On the Katy ISD page about the CBE (this is the place where I received most of my
          information from), it states that you can take the CBE for a course in other
          subjects like Science or Social Studies. However, as per my experience, I have
          never heard a single person taking the CBE for a subject other than Math or a
          Foreign language.
        </p>
        <p className="text-ink-soft text-base leading-relaxed">
          <strong className="text-ink font-semibold">Here is why:</strong> for almost all
          Science and Social studies courses, a KAP/AP level course is available. Hence,
          instead of taking a 5.0 weighted course, you will skip a 4.0, ACA-level course.
          This can decrease your GPA if you have more than 5.0 courses in your transcript.
          Hence, if you do want to skip or accelerate in those courses, I would recommend
          that you wait until High School for you to take them as summer courses.
        </p>
      </section>

      <section>
        <H2>Study resources</H2>
        <H3>My experience</H3>
        <p className="text-ink-soft text-base leading-relaxed mb-4">
          Because I took the 8th-grade math CBE, I had to learn half of 7th-grade math and
          all of 8th-grade math at once. I have listed the main resources I have used below:
        </p>
        <ul className={ul}>
          <li>
            <strong className="text-ink font-semibold">Khan Academy:</strong> this is an
            excellent resource that contains several courses that align with Texas TEKS. If
            you finish the corresponding course and all of the practice problems given, you
            are already 80% ready.
            <ul className={nestedUl}>
              <li>
                Some people typically complete the get-ready courses first. Although this
                might be a good option for some, it doesn't cover all the concepts, and you
                will miss out on some key points. Hence, you should start a course that
                matches your CBE and contains the Texas TEKS specification.
              </li>
              <li>Khan Academy is 100% free.</li>
            </ul>
          </li>
          <li>
            <strong className="text-ink font-semibold">STAAR released tests:</strong>{" "}
            although this might seem unconventional at first, as per my experience, the CBE
            (for math) is very similar to that year's STAAR test. Hence, because TEA releases
            previous year assessments, it is a great resource for you to practice and test
            your knowledge.
          </li>
          <li>
            <strong className="text-ink font-semibold">Practice:</strong> this might seem
            obvious, but for any CBE (especially for a math course), practice is crucial for
            you to test your knowledge. You should try to take some mock tests, see which
            areas you are weak in, and practice more in those areas. Lastly, because you
            didn't actually take that course in school, you are not likely habituated to the
            material. Hence, doing practice questions is the best way to ace this test.
          </li>
          <li>
            <strong className="text-ink font-semibold">UT study guides:</strong> study guides
            are posted on the Katy ISD website on the CBE (see the sources panel). The study
            guides contain:
            <ul className={nestedUl}>
              <li>A list of every unit and concept you need to know — this enables you to track your progress.</li>
              <li>Practice problems/similar questions.</li>
            </ul>
          </li>
        </ul>
        <p className="text-ink-soft text-sm mt-6">
          All the resources mentioned above are free for use.
        </p>
      </section>
    </article>
  );
}
