const db = require("../database/connection");

const defaultWeekDays = [
  {
    weekday: 0,
    is_open: false,
    open_time: null,
    close_time: null,
    has_lunch_break: false,
    lunch_start: null,
    lunch_end: null,
  },
  {
    weekday: 1,
    is_open: true,
    open_time: "08:00",
    close_time: "18:00",
    has_lunch_break: true,
    lunch_start: "12:00",
    lunch_end: "13:00",
  },
  {
    weekday: 2,
    is_open: true,
    open_time: "08:00",
    close_time: "18:00",
    has_lunch_break: true,
    lunch_start: "12:00",
    lunch_end: "13:00",
  },
  {
    weekday: 3,
    is_open: true,
    open_time: "08:00",
    close_time: "18:00",
    has_lunch_break: true,
    lunch_start: "12:00",
    lunch_end: "13:00",
  },
  {
    weekday: 4,
    is_open: true,
    open_time: "08:00",
    close_time: "18:00",
    has_lunch_break: true,
    lunch_start: "12:00",
    lunch_end: "13:00",
  },
  {
    weekday: 5,
    is_open: true,
    open_time: "08:00",
    close_time: "18:00",
    has_lunch_break: true,
    lunch_start: "12:00",
    lunch_end: "13:00",
  },
  {
    weekday: 6,
    is_open: true,
    open_time: "08:00",
    close_time: "12:00",
    has_lunch_break: false,
    lunch_start: null,
    lunch_end: null,
  },
];

function normalizeTime(value) {
  if (!value) return null;

  const [hours, minutes] = String(value).split(":");

  if (hours === undefined || minutes === undefined) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function timeToMinutes(value) {
  if (!value) return null;

  const [hours, minutes] = String(value).split(":");

  return Number(hours) * 60 + Number(minutes);
}

async function ensureWorkingHours(businessId) {
  for (const day of defaultWeekDays) {
    await db.query(
      `
      INSERT IGNORE INTO business_working_hours
      (
        business_id,
        weekday,
        is_open,
        open_time,
        close_time,
        has_lunch_break,
        lunch_start,
        lunch_end
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        businessId,
        day.weekday,
        day.is_open,
        day.open_time ? `${day.open_time}:00` : null,
        day.close_time ? `${day.close_time}:00` : null,
        day.has_lunch_break,
        day.lunch_start ? `${day.lunch_start}:00` : null,
        day.lunch_end ? `${day.lunch_end}:00` : null,
      ],
    );
  }
}

async function listWorkingHours(req, res) {
  try {
    const businessId = req.user.business_id;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    await ensureWorkingHours(businessId);

    const [workingHours] = await db.query(
      `
      SELECT
        id,
        weekday,
        is_open,
        TIME_FORMAT(open_time, '%H:%i') AS open_time,
        TIME_FORMAT(close_time, '%H:%i') AS close_time,
        has_lunch_break,
        TIME_FORMAT(lunch_start, '%H:%i') AS lunch_start,
        TIME_FORMAT(lunch_end, '%H:%i') AS lunch_end
      FROM business_working_hours
      WHERE business_id = ?
      ORDER BY weekday ASC
      `,
      [businessId],
    );

    return res.json({
      mensagem: "Horários de funcionamento listados com sucesso.",
      workingHours,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar horários de funcionamento.",
      erro: error.message,
    });
  }
}

async function updateWorkingHours(req, res) {
  const connection = await db.getConnection();

  try {
    const businessId = req.user.business_id;
    const { workingHours } = req.body;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    if (!Array.isArray(workingHours)) {
      return res.status(400).json({
        mensagem: "Horários inválidos.",
      });
    }

    if (workingHours.length !== 7) {
      return res.status(400).json({
        mensagem: "Informe os horários dos 7 dias da semana.",
      });
    }

    await connection.beginTransaction();

    for (const day of workingHours) {
      const weekday = Number(day.weekday);
      const isOpen = Boolean(day.is_open);
      const hasLunchBreak = Boolean(day.has_lunch_break);

      if (Number.isNaN(weekday) || weekday < 0 || weekday > 6) {
        await connection.rollback();

        return res.status(400).json({
          mensagem: "Dia da semana inválido.",
        });
      }

      const openTime = isOpen ? normalizeTime(day.open_time) : null;
      const closeTime = isOpen ? normalizeTime(day.close_time) : null;
      const lunchStart =
        isOpen && hasLunchBreak ? normalizeTime(day.lunch_start) : null;
      const lunchEnd =
        isOpen && hasLunchBreak ? normalizeTime(day.lunch_end) : null;

      if (isOpen) {
        if (!openTime || !closeTime) {
          await connection.rollback();

          return res.status(400).json({
            mensagem: "Informe horário inicial e final para os dias abertos.",
          });
        }

        if (timeToMinutes(openTime) >= timeToMinutes(closeTime)) {
          await connection.rollback();

          return res.status(400).json({
            mensagem: "O horário inicial deve ser menor que o horário final.",
          });
        }

        if (hasLunchBreak) {
          if (!lunchStart || !lunchEnd) {
            await connection.rollback();

            return res.status(400).json({
              mensagem: "Informe início e fim do almoço.",
            });
          }

          if (timeToMinutes(lunchStart) >= timeToMinutes(lunchEnd)) {
            await connection.rollback();

            return res.status(400).json({
              mensagem:
                "O início do almoço deve ser menor que o fim do almoço.",
            });
          }

          if (
            timeToMinutes(lunchStart) < timeToMinutes(openTime) ||
            timeToMinutes(lunchEnd) > timeToMinutes(closeTime)
          ) {
            await connection.rollback();

            return res.status(400).json({
              mensagem:
                "O almoço precisa estar dentro do horário de funcionamento.",
            });
          }
        }
      }

      await connection.query(
        `
        INSERT INTO business_working_hours
        (
          business_id,
          weekday,
          is_open,
          open_time,
          close_time,
          has_lunch_break,
          lunch_start,
          lunch_end
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          is_open = VALUES(is_open),
          open_time = VALUES(open_time),
          close_time = VALUES(close_time),
          has_lunch_break = VALUES(has_lunch_break),
          lunch_start = VALUES(lunch_start),
          lunch_end = VALUES(lunch_end)
        `,
        [
          businessId,
          weekday,
          isOpen,
          openTime,
          closeTime,
          hasLunchBreak,
          lunchStart,
          lunchEnd,
        ],
      );
    }

    await connection.commit();

    return res.json({
      mensagem: "Horários de funcionamento atualizados com sucesso.",
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      mensagem: "Erro ao atualizar horários de funcionamento.",
      erro: error.message,
    });
  } finally {
    connection.release();
  }
}

async function listScheduleBlocks(req, res) {
  try {
    const businessId = req.user.business_id;

    const [blocks] = await db.query(
      `
      SELECT
        id,
        DATE_FORMAT(block_date, '%Y-%m-%d') AS block_date,
        is_full_day,
        TIME_FORMAT(start_time, '%H:%i') AS start_time,
        TIME_FORMAT(end_time, '%H:%i') AS end_time,
        reason,
        created_at
      FROM business_schedule_blocks
      WHERE business_id = ?
      ORDER BY block_date DESC, start_time ASC
      `,
      [businessId],
    );

    return res.json({
      mensagem: "Bloqueios listados com sucesso.",
      blocks,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar bloqueios.",
      erro: error.message,
    });
  }
}

async function createScheduleBlock(req, res) {
  try {
    const businessId = req.user.business_id;

    const { block_date, is_full_day, start_time, end_time, reason } = req.body;

    if (!block_date) {
      return res.status(400).json({
        mensagem: "Informe a data do bloqueio.",
      });
    }

    const fullDay = Boolean(is_full_day);

    const startTime = fullDay ? null : normalizeTime(start_time);
    const endTime = fullDay ? null : normalizeTime(end_time);

    if (!fullDay) {
      if (!startTime || !endTime) {
        return res.status(400).json({
          mensagem: "Informe o horário inicial e final do bloqueio.",
        });
      }

      if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
        return res.status(400).json({
          mensagem:
            "O horário inicial do bloqueio deve ser menor que o horário final.",
        });
      }
    }

    const [result] = await db.query(
      `
      INSERT INTO business_schedule_blocks
      (
        business_id,
        block_date,
        is_full_day,
        start_time,
        end_time,
        reason
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        businessId,
        block_date,
        fullDay,
        startTime,
        endTime,
        reason ? reason.trim() : null,
      ],
    );

    return res.status(201).json({
      mensagem: "Bloqueio criado com sucesso.",
      block: {
        id: result.insertId,
        block_date,
        is_full_day: fullDay,
        start_time: startTime,
        end_time: endTime,
        reason: reason || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao criar bloqueio.",
      erro: error.message,
    });
  }
}

async function deleteScheduleBlock(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;

    const [result] = await db.query(
      `
      DELETE FROM business_schedule_blocks
      WHERE id = ?
      AND business_id = ?
      `,
      [id, businessId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        mensagem: "Bloqueio não encontrado.",
      });
    }

    return res.json({
      mensagem: "Bloqueio removido com sucesso.",
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao remover bloqueio.",
      erro: error.message,
    });
  }
}

module.exports = {
  listWorkingHours,
  updateWorkingHours,
  listScheduleBlocks,
  createScheduleBlock,
  deleteScheduleBlock,
};
