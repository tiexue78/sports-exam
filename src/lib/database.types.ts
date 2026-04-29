export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      questions: {
        Row: {
          id: number
          type: 'choice' | 'judge'
          category: string
          question: string
          options: string[] | null
          answer: string
        }
        Insert: {
          id: number
          type: 'choice' | 'judge'
          category: string
          question: string
          options?: string[] | null
          answer: string
        }
        Update: {
          id?: number
          type?: 'choice' | 'judge'
          category?: string
          question?: string
          options?: string[] | null
          answer?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      practice_progress: {
        Row: {
          id: string
          user_id: string
          category: string
          question_type: string
          current_index: number
          total_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category?: string
          question_type?: string
          current_index?: number
          total_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          current_index?: number
          total_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'practice_progress_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      exam_records: {
        Row: {
          id: string
          user_id: string
          category: string
          question_type: string
          question_count: number
          question_ids: number[]
          correct_count: number
          elapsed_seconds: number
          is_completed: boolean
          current_index: number
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          category?: string
          question_type?: string
          question_count: number
          question_ids: number[]
          correct_count?: number
          elapsed_seconds?: number
          is_completed?: boolean
          current_index?: number
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          category?: string
          question_type?: string
          correct_count?: number
          elapsed_seconds?: number
          is_completed?: boolean
          current_index?: number
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'exam_records_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      answers: {
        Row: {
          id: string
          user_id: string
          question_id: number
          exam_record_id: string | null
          mode: 'learn' | 'exam'
          user_answer: string
          is_correct: boolean
          answered_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: number
          exam_record_id?: string | null
          mode: 'learn' | 'exam'
          user_answer: string
          is_correct: boolean
          answered_at?: string
        }
        Update: {
          user_answer?: string
          is_correct?: boolean
          answered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'answers_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'answers_question_id_fkey'
            columns: ['question_id']
            isOneToOne: false
            referencedRelation: 'questions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'answers_exam_record_id_fkey'
            columns: ['exam_record_id']
            isOneToOne: false
            referencedRelation: 'exam_records'
            referencedColumns: ['id']
          }
        ]
      }
      wrong_questions: {
        Row: {
          id: string
          user_id: string
          question_id: number
          error_count: number
          last_wrong_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: number
          error_count?: number
          last_wrong_at?: string
        }
        Update: {
          error_count?: number
          last_wrong_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'wrong_questions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'wrong_questions_question_id_fkey'
            columns: ['question_id']
            isOneToOne: false
            referencedRelation: 'questions'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {}
    Functions: {
      increment_error_count: {
        Args: {
          p_user_id: string
          p_question_id: number
        }
        Returns: undefined
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}
